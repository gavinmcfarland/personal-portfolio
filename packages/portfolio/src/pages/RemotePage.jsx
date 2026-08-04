import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Files, List, X } from "lucide-react";
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
  const [state, setState] = useState(null); // last published {deck, index, pages, activePageId, title}
  const [status, setStatus] = useState("connecting");
  const [listOpen, setListOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
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
  const pages = (state && state.pages) || [];
  const activePageId = state && state.activePageId;
  const multiPage = pages.length > 1;
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  /* Only one panel at a time — the phone has one screenful, and two overlapping
     lists mid-talk is a way to lose your place. */
  const openList = (v) => { setListOpen(v); if (v) setPagesOpen(false); };
  const openPages = (v) => { setPagesOpen(v); if (v) setListOpen(false); };

  return (
    <main className="fixed inset-0 flex flex-col bg-base">
      <Seo title={`Remote · ${room || ""}`} noindex />

      <header className="flex items-center gap-2 border-b border-line px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => openList(!listOpen)}
          aria-label={listOpen ? "Close section list" : "Open section list"}
          className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-muted active:bg-accent-soft"
        >
          {listOpen ? <X className="size-4" /> : <List className="size-4" />}
          <span className="font-sans text-4 font-bold tabular-nums text-ink">
            {index >= 0 ? index + 1 : "–"}
            <span className="text-faint">/{deck.length || "–"}</span>
          </span>
        </button>
        <span className="min-w-0 flex-1 truncate font-sans text-4 text-muted">
          {state && state.title ? state.title : STATUS[status]}
        </span>
        {/* A single-page board has nothing to switch between, so the control
            isn't there to wonder about. */}
        {multiPage && (
          <button
            type="button"
            onClick={() => openPages(!pagesOpen)}
            aria-label={pagesOpen ? "Close page list" : "Change page"}
            className="rounded-lg p-2 text-muted active:bg-accent-soft"
          >
            {pagesOpen ? <X className="size-4" /> : <Files className="size-4" />}
          </button>
        )}
        <span className="font-sans text-4 tabular-nums text-faint">{mmss}</span>
      </header>

      {pagesOpen ? (
        <ol className="flex-1 overflow-y-auto">
          {pages.map((p) => {
            const count = deck.filter((s) => s.pageId === p.id).length;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => { send("page", p.id); openPages(false); }}
                  className={`flex w-full items-baseline gap-3 border-b border-line px-4 py-4 text-left ${
                    p.id === activePageId ? "bg-accent-soft" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-5 text-ink">
                    {p.name || "Untitled page"}
                  </span>
                  <span className="shrink-0 font-sans text-4 tabular-nums text-faint">
                    {count} {count === 1 ? "section" : "sections"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : listOpen ? (
        /* The whole running order, across every page of the board — stepping
           crosses page boundaries too, so this list is the same deck. Page
           headings only appear on a board that has more than one, where they
           tell you where you are; on a single-page board they'd be noise. */
        <ol className="flex-1 overflow-y-auto">
          {deck.map((s, i) => (
            <li key={s.id}>
              {multiPage && (i === 0 || deck[i - 1].pageId !== s.pageId) && (
                <h2 className="sticky top-0 border-b border-line bg-base px-4 py-2 font-sans text-2 font-bold uppercase tracking-label text-faint">
                  {s.pageName || "Untitled page"}
                </h2>
              )}
              <button
                type="button"
                onClick={() => { send("goto", s.id); openList(false); }}
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
          handed while talking — glanced at in a dark room, not studied. Same
          chevrons the present bar uses, so the two ends of the same control
          look like the same control. */}
      <div className="grid shrink-0 grid-cols-2 gap-px border-t border-line bg-line pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => send("prev")}
          aria-label="Previous section"
          className="flex items-center justify-center bg-base py-7 text-muted active:bg-accent-soft"
        >
          <ChevronLeft className="size-7" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => send("next")}
          aria-label="Next section"
          className="flex items-center justify-center bg-base py-7 text-ink active:bg-accent-soft"
        >
          <ChevronRight className="size-7" strokeWidth={1.8} />
        </button>
      </div>
    </main>
  );
}
