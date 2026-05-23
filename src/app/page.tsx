"use client";

import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { APP_ROUTES } from "@/lib/routes";

export default function Home() {
  const { session, isLoggedIn } = useSession();

  return (
    <main className="shell route-shell">
      <section className="hero-panel landing-hero">
        <p className="eyebrow">Interview Simulator</p>
        <h1>
          {isLoggedIn && session.username
            ? `Welcome back, ${session.username}!`
            : "Welcome to Interview Simulator"}
        </h1>
        <p className="hero-copy">
          Your personalized, AI-powered preparation environment. Simulate live technical interviews, practice coding challenges in real-time, test your knowledge with adaptive MCQs, and receive expert coaching critiques tailored to your performance.
        </p>
      </section>

      <section className="route-grid">
        {APP_ROUTES.filter(r => r.showAsCard).map(r => (
          <article key={r.path} className="card stack-card">
            <div className="card-heading">
              <p className="eyebrow">{r.cardEyebrow}</p>
              <h2>{r.cardTitle}</h2>
            </div>
            <p className="muted-copy">{r.cardDescription}</p>
            <Link className="ghost-button link-button" href={r.path}>
              Go to {r.name}
            </Link>
          </article>
        ))}

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
      </section>
    </main>
  );
}
