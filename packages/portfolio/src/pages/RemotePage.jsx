import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Files, List, Pause, Play, RotateCcw, X } from "lucide-react";
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
  const [running, setRunning] = useState(false);
  const banked = useRef(0);     // ms counted before the current run
  const since = useRef(null);   // Date.now() the current run began, or null when stopped
  const armed = useRef(true);   // still waiting to auto-start on the first section change
  const notesRef = useRef(null);

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
      // The talk starts when the board first lands on a section, not when the
      // phone was paired — see the timer below. Armed here rather than in an
      // effect on `state`, because this is the one place a position arrives.
      if (armed.current && data.index >= 0) {
        armed.current = false;
        since.current = Date.now();
        setRunning(true);
      }
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

  /* Talk timer.

     It starts itself on the first section change rather than on opening the
     page — the remote is usually paired several minutes before anyone speaks —
     and from then on the presenter owns it: tap the clock to stop and start,
     reset it back to zero between run-throughs. A talk that opens with a video,
     or pauses for questions that don't count against the slot, is a clock the
     presenter needs to be able to stop.

     Time is banked in milliseconds and read back off Date.now() rather than
     counted up per tick, because the interval on a phone is throttled the
     moment the screen locks or the browser backgrounds — a tick-counting clock
     would come back minutes short, at exactly the point in the talk where it's
     being trusted. */
  const readMs = () => banked.current + (since.current == null ? 0 : Date.now() - since.current);

  useEffect(() => {
    if (!running) return undefined;
    const tick = () => setElapsed(Math.floor(readMs() / 1000));
    tick();
    // Faster than the second it displays, so resuming lands on the right number
    // straight away instead of holding the old one for up to a second.
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [running]);

  /* Stop and start. Taking hold of the clock also disarms the auto-start, so a
     presenter who deliberately paused doesn't have it restarted underneath them
     by the next section change. */
  const toggleClock = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(8);
    armed.current = false;
    if (running) {
      banked.current = readMs();
      since.current = null;
      setRunning(false);
    } else {
      since.current = Date.now();
      setRunning(true);
    }
  }, [running]);

  /* Back to zero, keeping whatever the clock was doing: a reset mid-run is a
     restart, a reset while stopped stays stopped and waits. */
  const resetClock = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(8);
    banked.current = 0;
    since.current = running ? Date.now() : null;
    setElapsed(0);
  }, [running]);

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

  const pages = (state && state.pages) || [];
  const activePageId = state && state.activePageId;
  const multiPage = pages.length > 1;
  /* The board publishes its whole running order — every section on every page —
     but the remote navigates one page at a time, because that's the boundary
     next/prev keep. So the deck the presenter sees is the active page's slice
     of it: the list to jump around in, the count in the header, and the "n of"
     it reads against all mean the page on the screen. A board-wide count would
     read as progress through a talk that next/prev can't walk.

     Crossing to another page stays the page control's job. The full deck is
     still what the section index is published against, and what the page
     control counts, so both halves agree on what section 3 is. */
  const fullDeck = (state && state.deck) || [];
  const deck = activePageId ? fullDeck.filter((s) => s.pageId === activePageId) : fullDeck;
  const here = state && state.index >= 0 ? fullDeck[state.index] : null;
  const index = here ? deck.findIndex((s) => s.id === here.id) : -1;
  /* What the next button will actually land on — the following section on this
     page, or nothing at its end. Stepping stops there, so a section on another
     page isn't "next": previewing it would promise a tap that doesn't happen. */
  const next = index >= 0 ? deck[index + 1] || null : null;
  const pageName = (pages.find((p) => p.id === activePageId) || {}).name || "";
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  /* Start every section at the top of its notes. The pane is one scroll
     container that survives the section change, so without this a long note
     read to the bottom leaves the next section opening halfway down — the
     presenter's first line already scrolled off. Keyed on the section rather
     than the state, so a republish at the same position (a page rename, a
     reconnect) doesn't yank the notes back while they're being read.

     Layout effect, not effect: it has to land before the paint that swaps the
     text in, or the new section is briefly visible at the old scroll offset. */
  const hereId = here ? here.id : null;
  useLayoutEffect(() => {
    if (notesRef.current) notesRef.current.scrollTop = 0;
  }, [hereId, index]);

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
        {/* The clock is the button. A stopped clock reads louder than a running
            one — a talk timer sitting at 4:12 while the presenter thinks it's
            counting is worse than one that's plainly stopped. Reset only
            appears once the clock is stopped with something on it, so the
            header stays two controls wide for the whole talk and there's no
            live button that can wipe the time with a mis-tap. */}
        <div className="flex shrink-0 items-center">
          {!running && elapsed > 0 && (
            <button
              type="button"
              onClick={resetClock}
              aria-label="Reset timer"
              className="rounded-lg p-2 text-faint active:bg-accent-soft"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleClock}
            aria-label={running ? "Pause timer" : "Start timer"}
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 active:bg-accent-soft"
          >
            <span className={`font-sans text-4 tabular-nums ${running ? "text-faint" : "text-muted"}`}>
              {mmss}
            </span>
            {running ? (
              <Pause className="size-3.5 shrink-0 text-faint" />
            ) : (
              <Play className="size-3.5 shrink-0 text-muted" />
            )}
          </button>
        </div>
      </header>

      {pagesOpen ? (
        <ol className="flex-1 overflow-y-auto">
          {pages.map((p) => {
            const count = fullDeck.filter((s) => s.pageId === p.id).length;
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
        /* The running order for the page on the screen — the same sections
           next/prev walk, so a jump from this list and a tap on the chevrons
           are moves through one list rather than two. The page's name heads it
           on a board that has more than one page, where it says which running
           order you're reading; on a single-page board it'd be noise. */
        <ol className="flex-1 overflow-y-auto">
          {deck.map((s, i) => (
            <li key={s.id}>
              {multiPage && i === 0 && (
                <h2 className="sticky top-0 border-b border-line bg-base px-4 py-2 font-sans text-2 font-bold uppercase tracking-label text-faint">
                  {pageName || "Untitled page"}
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
        <div ref={notesRef} className="flex-1 overflow-y-auto px-5 py-5">
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
