import Link from "next/link";

export default function Home() {
  return (
    <main className="shell route-shell">
      <section className="hero-panel landing-hero">
        <div>
          <p className="eyebrow">Interview Simulater Frontend</p>
          <h1>Frontend routes are now split by product responsibility.</h1>
          <p className="hero-copy">
            Authentication lives on its own route, the interview workflow runs on its own protected
            route, and the API client now retries protected requests after an automatic JWT refresh.
          </p>
        </div>
        <div className="hero-links">
          <Link className="primary-button link-button" href="/auth">
            Open auth route
          </Link>
          <Link className="secondary-button link-button" href="/interview">
            Open interview route
          </Link>
          <Link className="ghost-button link-button" href="/personal-coach">
            Open personal coach
          </Link>
        </div>
      </section>

      <section className="route-grid">
        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Route Structure</p>
            <h2>Auth route</h2>
          </div>
          <p className="muted-copy">
            Register users, issue JWT tokens, refresh tokens manually, and configure the backend API
            target without mixing interview controls into the same screen.
          </p>
          <Link className="ghost-button link-button" href="/auth">
            Go to /auth
          </Link>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Protected Workspace</p>
            <h2>Interview route</h2>
          </div>
          <p className="muted-copy">
            Start interviews, fetch questions, submit answers, and inspect summary reports from a
            route dedicated to authenticated interview operations.
          </p>
          <Link className="ghost-button link-button" href="/interview">
            Go to /interview
          </Link>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">LLM Readiness</p>
            <h2>Waiting on provider details</h2>
          </div>
          <p className="muted-copy">
            The frontend already renders structured evaluation output from the backend. Once you give
            the purchased LLM provider details, the same UI will show real model-backed scoring with
            no route redesign needed.
          </p>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Personal Learning</p>
            <h2>Personal Coach route</h2>
          </div>
          <p className="muted-copy">
            Enter any topic, pick AI-generated subtopics, learn from concise lessons, answer
            coach questions, and get adaptive remediation or next-topic guidance based on score.
          </p>
          <Link className="ghost-button link-button" href="/personal-coach">
            Go to /personal-coach
          </Link>
        </article>
      </section>
    </main>
  );
}
