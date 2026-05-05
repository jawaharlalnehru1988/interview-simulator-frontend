"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useRef, useEffect } from "react";
import { useSession } from "@/lib/useSession";

export default function HeaderUserBadge() {
  const { session, isLoggedIn, logout } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    const username = session.username.trim();
    if (isLoggedIn && username) {
      return username;
    }
    return "";
  }, [isLoggedIn, session.username]);

  const initial = useMemo(() => displayName.charAt(0).toUpperCase() || "G", [displayName]);

  if (!isLoggedIn) {
    return null;
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
        <span className="user-avatar">{initial}</span>
        <span className="user-name">{displayName}</span>
      </button>

      {isMenuOpen && (
        <div className="user-menu-overlay">


          <button
            className="user-menu-item logout"
            onClick={() => {
              logout();
              setIsMenuOpen(false);
              router.push("/auth");
            }}
          >
            Logout
          </button>


        </div>
      )}
    </div>
  );
}
