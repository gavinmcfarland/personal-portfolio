import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Seo from "../components/Seo";

/* The phone in the presenter's hand.

   Deliberately not a canvas: this page renders no board, imports no engine and
   knows nothing about how a section is drawn. It reads a flat list of
   {label, notes} off the relay and posts back "next" / "prev" / "goto". That
   keeps it a few kilobytes on a phone browser over local Wi-Fi, and it means a
   change to the board's rendering can't break the remote mid-talk.

   It also never tracks its own position. Every tap is a request; the position
   it displays is whatever the board last published. A dropped command shows up
   as a button that didn't take — obvious, and fixed by pressing again — rather
   than as a remote quietly counting a different slide than the screen.

   Dev-only, like the relay behind it: presenting runs off the dev server on
   the laptop in the room, which is the machine the phone can reach. */

const STATUS = {
  connecting: "Connecting…",
  waiting: "No board is presenting on this code",
  live: "Connected",
  lost: "Reconnecting…",
};

/* Notes are authored in a plain textarea, so they're rendered as written:
   blank lines split paragraphs, single newlines are kept. Nothing is parsed as
   markup — a stray asterisk in a note should look like a stray asterisk, not
   silently change the text you're reading from at a podium.

   Set in explicit sizes rather than the site's --text-* scale. That scale is
   flat by design and tops out at 15px, which is right for reading a page at a
   desk and wrong for glancing at a phone held at your waist, mid-sentence,
   in a room with the lights down. */
function Notes({ text }) {
  if (!text || !text.trim()) {
    return <p className="text-[1rem] italic text-faint">No notes for this section.</p>;
  }
  return (
    <div className="space-y-5">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-wrap text-[1.3125rem] leading-[1.55] text-ink">
          {para}
        </p>
      ))}
    </div>
  );
}

export default function RemotePage() {
  const { room } = useParams();
  const [state, setState] = useState(null); // last published {deck, index, title}
  const [status, setStatus] = useState("connecting");
  const [listOpen, setListOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(null);

  /* Subscribe. EventSource reconnects on its own after the screen locks or the
     Wi-Fi drops, which is the whole reason for using it — so this only has to
     translate its events into something to render. */
  useEffect(() => {
    if (!room) return undefined;
    const es = new EventSource(`/__present/events?room=${encodeURIComponent(room)}`);
    const onState = (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (data && data.empty) { setStatus("waiting"); setState(null); return; }
      setStatus("live");
      setState(data);
    };
    es.addEventListener("state", onState);
    es.onopen = () => setStatus((s) => (s === "lost" ? "live" : s));
    // EventSource fires `error` on every reconnect attempt too, so this is a
    // "not right now" rather than a failure — it clears itself on reopen.
    es.onerror = () => setStatus("lost");
    return () => es.close();
  }, [room]);

  const send = useCallback(
    (cmd, id) => {
      // A tap is the presenter's whole interface here; acknowledge it on the
      // device even before the board has moved.
      if (navigator.vibrate) navigator.vibrate(8);
      fetch("/__present/cmd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ room, cmd, id }),
      }).catch(() => {});
    },
    [room],
  );

  /* Talk timer, started by the first section change rather than by opening the
     page — the remote is usually paired several minutes before anyone speaks. */
  useEffect(() => {
    if (!state || state.index < 0) return undefined;
    if (startedAt.current == null) startedAt.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  /* Keep the screen awake. Only works in a secure context, so over plain
     http://192.168.x.x it simply isn't there — the phone will dim, and that's
     a property of the network, not something to paper over. */
  useEffect(() => {
    let lock = null;
    const acquire = () => {
      if (!navigator.wakeLock) return;
      navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {});
    };
    acquire();
    // A lock is released whenever the page is hidden; take it again on return.
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (lock) lock.release().catch(() => {});
    };
  }, []);

  const deck = (state && state.deck) || [];
  const index = state ? state.index : -1;
  const here = index >= 0 ? deck[index] : null;
  const next = index >= 0 && index + 1 < deck.length ? deck[index + 1] : null;
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="fixed inset-0 flex flex-col bg-base">
      <Seo title={`Remote · ${room || ""}`} noindex />

      <header className="flex items-center gap-3 border-b border-line px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="font-sans text-4 font-bold tabular-nums text-ink"
        >
          {index >= 0 ? index + 1 : "–"}
          <span className="text-faint">/{deck.length || "–"}</span>
        </button>
        <span className="min-w-0 flex-1 truncate font-sans text-4 text-muted">
          {state && state.title ? state.title : STATUS[status]}
        </span>
        <span className="font-sans text-4 tabular-nums text-faint">{mmss}</span>
      </header>

      {listOpen ? (
        /* Jump anywhere in the running order. Sections from other pages of the
           board are in here too — goToSection switches pages on the way. */
        <ol className="flex-1 overflow-y-auto">
          {deck.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { send("goto", s.id); setListOpen(false); }}
                className={`flex w-full items-baseline gap-3 border-b border-line px-4 py-4 text-left ${
                  i === index ? "bg-accent-soft" : ""
                }`}
              >
                <span className="w-7 shrink-0 font-sans text-4 tabular-nums text-faint">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-sans text-5 text-ink">{s.label}</span>
                {/* Marks a section that has notes — the same dot the board's
                    frame label carries, so "written" reads the same on both. */}
                {s.notes ? <span className="size-1.5 shrink-0 rounded-full bg-(--accent)" aria-label="has notes" /> : null}
              </button>
            </li>
          ))}
          {deck.length === 0 && (
            <li className="px-4 py-6 text-4 text-faint">{STATUS[status]}</li>
          )}
        </ol>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* The section title is confirmation, not content — the presenter can
              already see the section on the screen behind them. It sits above
              the notes as a label, and the notes get the room. */}
          <h1 className="mb-5 font-sans text-2 font-bold uppercase tracking-label text-faint">
            {here ? here.label : STATUS[status]}
          </h1>
          {here && <Notes text={here.notes} />}
          {next && (
            <p className="mt-10 border-t border-line pt-4 font-sans text-4 text-faint">
              Next · {next.label}
            </p>
          )}
        </div>
      )}

      {/* Two targets filling the width, sized for a thumb on a phone held one-
          handed while talking. Labels rather than icons: this gets glanced at
          in a dark room, not studied. */}
      <div className="grid shrink-0 grid-cols-2 gap-px border-t border-line bg-line pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => send("prev")}
          className="bg-base py-7 font-sans text-[1.5rem] leading-none text-muted active:bg-accent-soft"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => send("next")}
          className="bg-base py-7 font-sans text-[1.5rem] leading-none text-ink active:bg-accent-soft"
        >
          →
        </button>
      </div>
    </main>
  );
}
