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
            Open Login Page
          </Link>
          <Link className="secondary-button link-button" href="/interview">
            Interview page
          </Link>
          <Link className="ghost-button link-button" href="/personal-coach">
            Open personal coach
          </Link>
          <Link className="ghost-button link-button" href="/job-analyzer">
            Open JD analyzer
          </Link>
          <Link className="ghost-button link-button" href="/aspiration">
            Open aspiration planner
          </Link>
          <Link className="ghost-button link-button" href="/profile-settings">
            Open profile settings
          </Link>
          <Link className="ghost-button link-button" href="/hr-voice-call">
            Open HR voice call
          </Link>
        </div>
      </section>

      <section className="route-grid">
        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Route Structure</p>
            <h2>Login Page</h2>
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
            <h2>Interview page</h2>
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

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Career Analysis</p>
            <h2>Job Description Analyzer route</h2>
          </div>
          <p className="muted-copy">
            Analyze recruiter intent, split skills by priority, detect disclosed compensation, estimate
            market-demand salary range, and get actionable recommendation bullets before applying.
          </p>
          <Link className="ghost-button link-button" href="/job-analyzer">
            Go to /job-analyzer
          </Link>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Career Direction</p>
            <h2>User Aspiration route</h2>
          </div>
          <p className="muted-copy">
            Capture your current position, target role, timeline, and constraints. AI then builds a
            practical roadmap with phased milestones to reach your target job.
          </p>
          <Link className="ghost-button link-button" href="/aspiration">
            Go to /aspiration
          </Link>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Profile Setup</p>
            <h2>Profile Settings route</h2>
          </div>
          <p className="muted-copy">
            Fill complete career details in multiple sections so AI can ask realistic recruiter
            screening questions aligned to your background.
          </p>
          <Link className="ghost-button link-button" href="/profile-settings">
            Go to /profile-settings
          </Link>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Recruiter Simulation</p>
            <h2>HR Voice Call Interview route</h2>
          </div>
          <p className="muted-copy">
            Simulate 10-15 recruiter call questions based on your profile, aspiration, and JD analysis,
            then receive pass/fail guidance with strong/weak answers and improvement steps.
          </p>
          <Link className="ghost-button link-button" href="/hr-voice-call">
            Go to /hr-voice-call
          </Link>
        </article>
      </section>
    </main>
  );
}
