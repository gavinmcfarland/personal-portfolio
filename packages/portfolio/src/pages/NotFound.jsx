import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { ArrowLeft } from "../components/ui";

const NotFound = () => (
  <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 sm:px-6">
    <Seo
      title="Page not found"
      description="That page doesn't exist — it may have moved, or the link was mistyped."
    />
    <p className="font-sans text-3 font-bold uppercase tracking-label text-faint">
      404
    </p>
    {/* The wordmark, like every other page title — it was a fourth display pair
        (2/2.5rem at 1.05) doing the same job at a different size. */}
    <h1 className="wordmark mt-(--sp-2)">Nothing here</h1>
    <p className="max-w-measure-narrow text-pretty text-4 text-muted">
      That page doesn&rsquo;t exist — it may have moved, or the link was mistyped.
    </p>
    <Link
      to="/"
      className="group mt-(--sp-8) inline-flex w-fit items-center gap-2 font-sans text-4 font-medium text-muted transition-colors duration-200 hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      Back home
    </Link>
  </main>
);

export default NotFound;
