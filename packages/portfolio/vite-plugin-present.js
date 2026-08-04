/* Dev-only relay between a presenting board and the phone driving it.

   The site is a static build on Vercel, so there is no server to hold a session
   — but presenting always happens off `pnpm dev` on the laptop in the room, and
   that dev server is already on the LAN. It only has to relay: the presenter
   posts its deck and where it is in it, the phone posts next/prev/goto, and
   each is fanned out to whoever is listening on that room.

   Server-Sent Events rather than a WebSocket, because a phone locks its screen
   mid-talk and EventSource reconnects on its own — a socket would need that
   written by hand, and written badly it fails exactly when it matters. The
   presenter is the ONLY writer of `index`: a command from the phone is relayed
   to the board, the board moves, and the board publishes the new index back.
   That keeps one source of truth and means a phone that missed an event just
   catches up on the next publish rather than fighting the board over position.

   Rooms are in memory and disappear with the dev server, which is the right
   lifetime — a room outliving the talk is a phone driving a board nobody is
   watching. */

const HEARTBEAT_MS = 15000; // a comment line, so proxies and phones hold the stream open
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // idle rooms are swept on the next publish

/* room id → { state, clients:Set<res>, touched:number } */
const rooms = new Map();

function room(id) {
	let r = rooms.get(id);
	if (!r) { r = { state: null, clients: new Set(), touched: 0 }; rooms.set(id, r); }
	return r;
}

/* Drop rooms nothing has touched in a while and nobody is listening to. Called
   on publish, so a long-running dev server doesn't accumulate dead sessions. */
function sweep(now) {
	for (const [id, r] of rooms) {
		if (r.clients.size === 0 && now - r.touched > ROOM_TTL_MS) rooms.delete(id);
	}
}

function send(res, event, data) {
	try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }
	catch { /* client vanished; the close handler will unregister it */ }
}

function fanout(r, event, data, except) {
	for (const c of r.clients) if (c !== except) send(c, event, data);
}

function readJson(req, limit = 2 * 1024 * 1024) {
	return new Promise((resolve, reject) => {
		let body = '';
		req.on('data', (c) => {
			body += c;
			if (body.length > limit) { reject(new Error('payload too large')); req.destroy(); }
		});
		req.on('end', () => {
			try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); }
		});
		req.on('error', reject);
	});
}

function json(res, code, body) {
	res.statusCode = code;
	res.setHeader('content-type', 'application/json');
	res.end(JSON.stringify(body));
}

/* The address the phone should open. `resolvedUrls.network` is what Vite prints
   on boot — the actual LAN interface, which is the one thing the presenter's
   own `location.hostname` can never tell it (that reads `localhost`). */
function networkUrl(server) {
	const urls = server.resolvedUrls;
	const net = urls && urls.network && urls.network[0];
	return net ? net.replace(/\/$/, '') : null;
}

export function present() {
	return {
		name: 'present-relay',
		apply: 'serve',
		configureServer(server) {
			/* Subscribe to a room. Both ends use this one stream and pick out the
			   events meant for them: the phone reads `state`, the board reads `cmd`. */
			server.middlewares.use('/__present/events', (req, res, next) => {
				if (req.method !== 'GET') return next();
				const id = new URL(req.url, 'http://x').searchParams.get('room');
				if (!id) return json(res, 400, { ok: false, error: 'room required' });

				res.statusCode = 200;
				res.setHeader('content-type', 'text/event-stream');
				res.setHeader('cache-control', 'no-cache, no-transform');
				res.setHeader('connection', 'keep-alive');
				// Nothing downstream may buffer this; a proxy that does turns the
				// remote into a page that updates once the talk is over.
				res.setHeader('x-accel-buffering', 'no');
				if (res.flushHeaders) res.flushHeaders();

				const r = room(id);
				r.clients.add(res);
				// Catch the newcomer up immediately, so a phone opened at section 7
				// shows section 7 rather than waiting for the presenter to move.
				send(res, 'state', r.state || { empty: true });

				const beat = setInterval(() => {
					try { res.write(': ping\n\n'); } catch { /* closing */ }
				}, HEARTBEAT_MS);

				const done = () => {
					clearInterval(beat);
					r.clients.delete(res);
				};
				req.on('close', done);
				req.on('error', done);
			});

			/* The presenting board publishes its deck and current position. */
			server.middlewares.use('/__present/publish', (req, res, next) => {
				if (req.method !== 'POST') return next();
				readJson(req)
					.then((body) => {
						const id = body && body.room;
						if (!id) return json(res, 400, { ok: false, error: 'room required' });
						const r = room(id);
						const now = Date.now();
						r.touched = now;
						/* Fields are named rather than spread: this is the contract
						   between two independently-loaded pages, and a typo on the
						   board should fail here instead of quietly reaching the
						   phone. Adding something the remote renders means adding
						   it here too. */
						r.state = {
							deck: Array.isArray(body.deck) ? body.deck : [],
							index: Number.isFinite(+body.index) ? +body.index : 0,
							pages: Array.isArray(body.pages) ? body.pages : [],
							activePageId: body.activePageId || '',
							board: body.board || '',
							title: body.title || '',
							at: now,
						};
						fanout(r, 'state', r.state);
						sweep(now);
						json(res, 200, { ok: true, listeners: r.clients.size });
					})
					.catch((e) => json(res, 400, { ok: false, error: String(e.message || e) }));
			});

			/* The phone drives the board. Relayed as-is; the board decides what it
			   means and publishes the result, so the phone never guesses a position. */
			server.middlewares.use('/__present/cmd', (req, res, next) => {
				if (req.method !== 'POST') return next();
				readJson(req, 64 * 1024)
					.then((body) => {
						const id = body && body.room;
						if (!id) return json(res, 400, { ok: false, error: 'room required' });
						const r = rooms.get(id);
						// No room means no board is presenting under this code — worth
						// saying so, since the usual cause is a stale link on the phone.
						if (!r) return json(res, 404, { ok: false, error: 'no such room' });
						r.touched = Date.now();
						fanout(r, 'cmd', { cmd: body.cmd, id: body.id || null });
						json(res, 200, { ok: true });
					})
					.catch((e) => json(res, 400, { ok: false, error: String(e.message || e) }));
			});

			/* The URL to put on screen as a QR code. */
			server.middlewares.use('/__present/link', (req, res, next) => {
				if (req.method !== 'GET') return next();
				const id = new URL(req.url, 'http://x').searchParams.get('room') || '';
				const base = networkUrl(server);
				if (!base) return json(res, 503, { ok: false, error: 'no network address' });
				json(res, 200, { ok: true, url: `${base}/remote/${id}`, base });
			});
		},
	};
}
