import { createContext } from "react";

/* How <HomeProse> renders a region: null for the text as the file has it, or
   the dev editor's `renderRegion` once that has loaded (src/pages/Home.jsx). */
export const HomeProseContext = createContext(null);
