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
              <p className="eyebrow">AI Analysis</p>
              <h2>Resume Analyzer</h2>
            </div>
            <p className="muted-copy">
              Upload your resume as a PDF. The system extracts the text and generates 15 tailored
              interview questions — technical, behavioral, and situational — just like a real interviewer would ask.
            </p>
            <Link className="ghost-button link-button" href="/resume-analyzer">
              Go to Resume Analyzer
            </Link>
          </article>
      </section>
    </main>
  );
}
