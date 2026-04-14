"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/useSession";
import HeaderUserBadge from "./HeaderUserBadge";

export default function TopNavbar() {
  const { isLoggedIn } = useSession();
  const pathname = usePathname();

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
          </nav>
          <HeaderUserBadge />
        </div>
      </header>
    </div>
  );
}
