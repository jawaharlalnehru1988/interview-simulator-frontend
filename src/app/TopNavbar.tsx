"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/useSession";
import HeaderUserBadge from "./HeaderUserBadge";
import { useTopics } from "@/context/TopicContext";
import { APP_ROUTES } from "@/lib/routes";

export default function TopNavbar() {
  const { isLoggedIn, logout } = useSession();
  const { setIsAddTopicOpen } = useTopics();
  const pathname = usePathname();
  const router = useRouter();
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {pathname !== "/" && (
            <Link className="nav-link" href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Go Back
            </Link>
          )}
          <Link className="brand-mark" href="/">
            Interview Simulator
          </Link>
        </div>
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
            {APP_ROUTES.filter(r => r.path === "/").map(r => (
              <Link
                key={r.path}
                className={`nav-link ${pathname === r.path ? "active" : ""}`}
                href={r.path}
                onClick={handleNavClick}
              >
                {r.name}
              </Link>
            ))}
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
            {APP_ROUTES.filter(r => r.path !== "/").map(r => (
              <Link
                key={r.path}
                className={`nav-link ${pathname === r.path ? "active" : ""}`}
                href={r.path}
                onClick={handleNavClick}
              >
                {r.name}
              </Link>
            ))}
          </nav>
           {isLoggedIn && (
            <button
              className="nav-link nav-action"
              onClick={() => setIsAddTopicOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              type="button"
            >
              ➕ Add Topic
            </button>
          )}
          <HeaderUserBadge />
        </div>
      </header>
    </div>
  );
}
