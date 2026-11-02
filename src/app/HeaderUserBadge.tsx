"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useSession } from "@/lib/useSession";

export default function HeaderUserBadge() {
  const { session, isLoggedIn, logout } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Also close on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const displayName = useMemo(() => {
    const username = (session.username ?? "").trim();
    if (isLoggedIn && username) {
      return username;
    }
    return "";
  }, [isLoggedIn, session.username]);

  const initial = useMemo(() => displayName.charAt(0).toUpperCase() || "U", [displayName]);

  // Immediately render nothing if logged out
  if (!isLoggedIn || !displayName) {
    return null;
  }

  const userPicture = session.picture;

  function handleLogout() {
    logout();
    setIsMenuOpen(false);
    window.location.href = "/auth?mode=login";
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
        title={displayName}
      >
        {userPicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userPicture}
            alt={displayName}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1.5px solid #3b82f6",
              display: "inline-block",
            }}
          />
        ) : (
          <span className="user-avatar">{initial}</span>
        )}
        <span className="user-name hide-on-mobile">{displayName}</span>
      </button>

      {isMenuOpen && (
        <div className="user-menu-overlay">
          <button
            type="button"
            className="user-menu-item logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
