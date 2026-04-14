"use client";

import Link from "next/link";
import { useSession } from "@/lib/useSession";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { session, isLoggedIn } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isLoggedIn) {
    return (
      <main className="shell route-shell">
        <section className="route-hero">
          <div>
            <p className="eyebrow">Profile Settings</p>
            <h1>Authentication Required</h1>
            <p className="hero-copy">Please log in to view and manage your profile settings.</p>
          </div>
          <div className="hero-links">
            <Link className="primary-button link-button" href="/auth">
              Go to Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell route-shell">
      <section className="route-grid">
        <article className="card stack-card tall-card">
          <div className="card-heading">
            <p className="eyebrow">User Profile</p>
            <h2>Account Details</h2>
          </div>
          <div className="summary-list">
            <div className="summary-item">
              <div className="summary-item-head">
                <strong>Username</strong>
              </div>
              <p>{session.username}</p>
            </div>
            <div className="summary-item">
              <div className="summary-item-head">
                <strong>Email Address</strong>
              </div>
              <p>{session.email || "Not provided"}</p>
            </div>
            <div className="summary-item">
              <div className="summary-item-head">
                <strong>Current Status</strong>
              </div>
              <p className="text-accent font-bold">Active Member</p>
            </div>
          </div>
        </article>

        <article className="card stack-card">
          <div className="card-heading">
            <p className="eyebrow">Actions</p>
            <h2>Quick Links</h2>
          </div>
          <div className="stack-card">
            <Link className="secondary-button link-button" href="/interview">
              My Interviews
            </Link>
            <Link className="secondary-button link-button" href="/personal-coach">
              Coach Sessions
            </Link>
            <Link className="ghost-button link-button" href="/">
              Back to Dashboard
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
