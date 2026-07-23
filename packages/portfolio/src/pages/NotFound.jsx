import { Link } from "react-router-dom";
import { ArrowLeft } from "../components/ui";

const NotFound = () => (
  <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 sm:px-6">
    <p className="font-sans text-[0.8125rem] font-bold uppercase tracking-[0.09em] text-faint">
      404
    </p>
    <h1 className="mt-3 text-[2rem] font-bold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[2.5rem]">
      Nothing here
    </h1>
    <p className="mt-4 max-w-[48ch] text-pretty text-[1.0625rem] leading-relaxed text-muted">
      That page doesn&rsquo;t exist — it may have moved, or the link was mistyped.
    </p>
    <Link
      to="/"
      className="group mt-8 inline-flex w-fit items-center gap-2 font-sans text-[0.9375rem] font-medium text-muted transition-colors duration-200 hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      Back home
    </Link>
  </main>
);

export default NotFound;
