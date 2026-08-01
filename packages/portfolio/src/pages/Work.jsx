import Seo from "../components/Seo";
import DocShell from "../components/DocShell";
import { ProjectList } from "../components/Projects";
import { visibleProjects } from "../data/projects";

/* The work index — the third link in the bar.
 *
 * It sets the same rows Home sets under EXAMPLES (one <ProjectList>, imported
 * rather than copied), opened the way the writing archive is: a flush masthead
 * with no NAME label, a paragraph of what the list is, then the list under a
 * single section head. The two index pages of this site should open the same
 * way, and this is that page for the work. */
export default function Work() {
  const count = visibleProjects.length;

  return (
    <DocShell>
      <Seo
        title="Work"
        description="Tools, libraries and plugins I've designed and built end-to-end."
      />

      <header className="pt-(--sp-8)">
        <h1 className="wordmark">work</h1>
        <p className="max-w-measure text-pretty text-muted">
          A selection of work I&rsquo;ve designed and built end-to-end. Each one
          reflects a problem I wanted to solve and the craft that went into
          making it feel effortless to use.
        </p>
      </header>

      <h2 className="section-label reveal">Projects</h2>
      <ProjectList />

      {count > 0 && (
        <p className="note indent reveal">
          {count} {count === 1 ? "project" : "projects"}.
        </p>
      )}

      <p className="colophon reveal">
        © {new Date().getFullYear()} Gavin McFarland
      </p>
    </DocShell>
  );
}
