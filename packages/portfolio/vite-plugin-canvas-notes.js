/* Keep speaker notes out of the shipped site.

   Notes live on the frame node in src/data/canvas/<board>.json so they ride the
   canvas's normal patch → history → autosave path, and so `git commit` keeps
   them with the board they belong to. But canvasBoards.js globs every one of
   those files eagerly into the bundle, which would hand a visitor the script
   for the talk alongside the slides. These are rehearsal notes — half-formed,
   written for one person — and nobody else has any business reading them.

   So the file on disk keeps its notes and the bundle never sees them: this
   transform rewrites the JSON modules during `vite build` only. In dev the
   files load untouched, which is what the notes drawer and the phone remote
   both read. */

const BOARD_RE = /[\\/]src[\\/]data[\\/]canvas[\\/][^\\/]+\.json(\?.*)?$/;

/* Walk the parsed snapshot dropping every `notes`. Sections live under
   pages[].nodes[], but the shape has changed before (v1 was single-page), so
   this recurses rather than reaching for a fixed path — a note that moved
   would otherwise silently start shipping. */
function stripNotes(value) {
	if (Array.isArray(value)) return value.map(stripNotes);
	if (value && typeof value === 'object') {
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			if (k === 'notes') continue;
			out[k] = stripNotes(v);
		}
		return out;
	}
	return value;
}

export function canvasNotes() {
	return {
		name: 'canvas-notes-strip',
		apply: 'build',
		// Ahead of Vite's own json plugin, which would otherwise have already
		// turned the file into an ES module by the time we saw it.
		enforce: 'pre',
		transform(code, id) {
			if (!BOARD_RE.test(id)) return null;
			let parsed;
			try { parsed = JSON.parse(code); } catch { return null; } // let Vite report the bad JSON
			const stripped = stripNotes(parsed);
			const out = JSON.stringify(stripped);
			if (out === JSON.stringify(parsed)) return null;
			return { code: out, map: null };
		},
	};
}
