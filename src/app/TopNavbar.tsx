import Link from "next/link";

import HeaderUserBadge from "./HeaderUserBadge";

export default function TopNavbar() {
  return (
    <div className="top-navbar">
      <header className="site-header">
        <Link className="brand-mark" href="/">
          Interview Simulater
        </Link>
        <div className="header-right">
          <nav className="site-nav" aria-label="Primary">
            <Link className="nav-link" href="/auth">
              Auth
            </Link>
            <Link className="nav-link" href="/interview">
              Interview
            </Link>
            <Link className="nav-link" href="/personal-coach">
              Personal Coach
            </Link>
          </nav>
          <HeaderUserBadge />
        </div>
      </header>
    </div>
  );
}
