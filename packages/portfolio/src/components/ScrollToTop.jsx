import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/* Reset scroll to the top on every route change — otherwise navigating from a
   scrolled home page into a project page lands mid-page. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
