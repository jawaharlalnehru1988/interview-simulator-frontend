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
        className="user-menu-trigger flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(58,42,33,0.12)] bg-[rgba(255,250,243,0.72)] cursor-pointer hover:bg-[rgba(255,250,243,0.95)] transition-all"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
        title={displayName}
      >
        <span className="user-avatar flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-[#b44f2b] to-[#efc58d] text-white font-bold text-sm uppercase">
          {initial}
        </span>
        <span className="user-name font-semibold text-sm max-w-[110px] truncate">
          {displayName}
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 min-w-[220px] bg-[rgba(255,250,238,0.95)] backdrop-blur-md border border-[rgba(58,42,33,0.12)] rounded-2xl shadow-[0_20px_50px_rgba(67,39,23,0.15)] p-2 z-[100] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-[rgba(58,42,33,0.08)] mb-1">
            <span className="block text-[10px] text-muted uppercase tracking-wider font-bold">
              Signed in as
            </span>
            <strong className="block text-sm text-ink truncate">
              {session.email || session.username}
            </strong>
          </div>
          <button
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-ink rounded-xl hover:bg-[rgba(180,79,43,0.08)] hover:text-[#b44f2b] transition-colors text-left"
            onClick={() => setIsMenuOpen(false)}
          >
            Profile Settings
          </button>
          <button
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-ink rounded-xl hover:bg-[rgba(180,79,43,0.08)] hover:text-[#b44f2b] transition-colors text-left"
            onClick={() => setIsMenuOpen(false)}
          >
            My Interviews
          </button>
          <div className="h-px bg-[rgba(58,42,33,0.08)] my-1" />
          <button
            className="flex items-center w-full px-4 py-2.5 text-sm font-bold text-[#b44f2b] rounded-xl hover:bg-[rgba(180,79,43,0.12)] transition-colors text-left"
            onClick={() => {
              logout();
              setIsMenuOpen(false);
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
