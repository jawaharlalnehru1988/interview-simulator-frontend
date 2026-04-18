"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/useSession";
import HeaderUserBadge from "./HeaderUserBadge";
import { useTheme } from "@/lib/useTheme";

export default function TopNavbar() {
  const { isLoggedIn } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="top-navbar">
      <header className="site-header">
        <Link className="brand-mark" href="/">
          Interview Simulator
        </Link>
        <div className="header-right">
          <nav className="site-nav" aria-label="Primary">
            {!isLoggedIn && (
              <Link
                className={`nav-link ${pathname === "/auth" ? "active" : ""}`}
                href="/auth"
              >
                Login
              </Link>
            )}
            <Link
              className={`nav-link ${pathname === "/interview" ? "active" : ""}`}
              href="/interview"
            >
              Interview
            </Link>
            <Link
              className={`nav-link ${pathname === "/personal-coach" ? "active" : ""}`}
              href="/personal-coach"
            >
              Personal Coach
            </Link>
            <Link
              className={`nav-link ${pathname === "/job-analyzer" ? "active" : ""}`}
              href="/job-analyzer"
            >
              JD Analyzer
            </Link>
            <Link
              className={`nav-link ${pathname === "/aspiration" ? "active" : ""}`}
              href="/aspiration"
            >
              Aspiration
            </Link>
            <Link
              className={`nav-link ${pathname === "/profile-settings" ? "active" : ""}`}
              href="/profile-settings"
            >
              Profile
            </Link>
            <Link
              className={`nav-link ${pathname === "/hr-voice-call" ? "active" : ""}`}
              href="/hr-voice-call"
            >
              HR Voice Call
            </Link>
          </nav>
          <HeaderUserBadge />
                  <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label="Toggle dark/light theme"
                    title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                  >
                    {theme === "light" ? (
                      <svg className="theme-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    ) : (
                      <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    )}
                  </button>
        </div>
      </header>
    </div>
  );
}
