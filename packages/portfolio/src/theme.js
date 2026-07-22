/* The JS mirror of the accent primitives. The <Canvas> library renders to a JS
   surface and needs concrete colour strings, not CSS var()s, so the accent can't
   be read from the `--accent` token at paint time — this is the single token the
   canvas side derives from (every `accent=` prop and `stroke: ACCENT.*` imports
   it; none write their own literal).
     light === --vermilion-500, dark === --galley-vermilion in app.css.
   These are the only raw colour values outside the app.css primitive palette —
   keep them in sync with those two primitives. */
export const ACCENT = { light: '#C8341A', dark: '#E0563C' };
