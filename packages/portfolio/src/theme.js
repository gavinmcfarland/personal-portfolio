/* Single source of truth for the portfolio's accent/theme colour. The CSS tokens
   in app.css (`--accent`) carry it across the site chrome; this constant feeds the
   same colour to the embedded <Canvas> instances via their `accent` prop, and
   seeds the on-brand accent arrows. Keep the values in sync with app.css. */
export const ACCENT = { light: '#1E7A4D', dark: '#56D49B' };
