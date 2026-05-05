"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/useSession";
import HeaderUserBadge from "./HeaderUserBadge";
import { useTheme } from "@/lib/useTheme";

export default function TopNavbar() {
  const { isLoggedIn, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthPage = pathname === "/auth";
  const authMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "register"
      ? "register"
      : "login";
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  function handleNavClick() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    setMenuOpen(false);
    router.push("/auth?mode=login");
  }

  return (
    <div className="top-navbar">
      <header className="site-header">
        <Link className="brand-mark" href="/">
          Interview Simulator
        </Link>
        <div className="header-right" ref={navRef}>
          <button
            className="menu-toggle"
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-line" />
            <span className="menu-line" />
            <span className="menu-line" />
          </button>

          <nav className={`site-nav ${menuOpen ? "open" : ""}`} aria-label="Primary">
            {!isLoggedIn && !isAuthPage && (
              <Link
                className={`nav-link ${pathname === "/auth" ? "active" : ""}`}
                href="/auth?mode=login"
                onClick={handleNavClick}
              >
                Login
              </Link>
            )}
            {!isLoggedIn && isAuthPage && (
              <>
                <Link
                  className={`nav-link ${authMode === "login" ? "active" : ""}`}
                  href="/auth?mode=login"
                  onClick={handleNavClick}
                >
                  Login
                </Link>
                <Link
                  className={`nav-link ${authMode === "register" ? "active" : ""}`}
                  href="/auth?mode=register"
                  onClick={handleNavClick}
                >
                  Register
                </Link>
              </>
            )}
            {isLoggedIn && (
              <button className="nav-link nav-action" onClick={handleLogout} type="button">
                Logout
              </button>
            )}
            <Link
              className={`nav-link ${pathname === "/interview" ? "active" : ""}`}
              href="/interview"
              onClick={handleNavClick}
            >
              Interview
            </Link>
            <Link
              className={`nav-link ${pathname === "/personal-coach" ? "active" : ""}`}
              href="/personal-coach"
              onClick={handleNavClick}
            >
              Personal Coach
            </Link>
            <Link
              className={`nav-link ${pathname === "/job-analyzer" ? "active" : ""}`}
              href="/job-analyzer"
              onClick={handleNavClick}
            >
              JD Analyzer
            </Link>
            <Link
              className={`nav-link ${pathname === "/aspiration" ? "active" : ""}`}
              href="/aspiration"
              onClick={handleNavClick}
            >
              Aspiration
            </Link>
            <Link
              className={`nav-link ${pathname === "/profile-settings" ? "active" : ""}`}
              href="/profile-settings"
              onClick={handleNavClick}
            >
              Profile
            </Link>
            <Link
              className={`nav-link ${pathname === "/hr-voice-call" ? "active" : ""}`}
              href="/hr-voice-call"
              onClick={handleNavClick}
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
