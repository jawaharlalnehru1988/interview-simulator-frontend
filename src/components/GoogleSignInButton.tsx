"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadClientSession,
  saveClientSession,
  SESSION_UPDATED_EVENT,
} from "@/lib/session";

declare const google: any;

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "977135259177-1tpp90bmrnr7dokqjuu1bh08h7p84neh.apps.googleusercontent.com";

interface GoogleSignInButtonProps {
  redirectAfterLogin?: string;
  buttonText?: string;
  className?: string;
}

export default function GoogleSignInButton({
  redirectAfterLogin = "/",
  buttonText = "Sign in with Google",
  className = "",
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const btnContainerRef = useRef<HTMLDivElement>(null);
  const [gsiRendered, setGsiRendered] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout;
    const initGsi = () => {
      if (typeof google !== "undefined" && google.accounts?.id) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (btnContainerRef.current) {
            btnContainerRef.current.innerHTML = "";
            google.accounts.id.renderButton(btnContainerRef.current, {
              theme: "outline",
              size: "medium",
              shape: "pill",
              text: "signin_with",
              logo_alignment: "left",
            });
            setGsiRendered(true);
          }
        } catch (e) {
          console.warn("Google GSI initialization error", e);
        }
      } else {
        timeoutId = setTimeout(initGsi, 300);
      }
    };

    initGsi();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  function handleGoogleResponse(response: any) {
    if (!response?.credential) return;

    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const currentSession = loadClientSession(
        process.env.NEXT_PUBLIC_API_BASE_URL || "https://interview-trainer.asknehru.com"
      );

      saveClientSession({
        ...currentSession,
        username: payload.name || payload.email.split("@")[0],
        email: payload.email,
        accessToken: response.credential,
        refreshToken: response.credential,
        picture: payload.picture || "",
        loginTimestamp: Date.now(),
      });

      window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));

      const searchRedirect =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("redirect")
          : null;
      const target = redirectAfterLogin || searchRedirect || "/";

      // Use window.location.href to guarantee reliable navigation outside React's event loop
      window.location.href = target;
    } catch (err) {
      console.error("Failed to process Google sign in credential", err);
    }
  }

  function handleManualClick() {
    if (typeof google !== "undefined" && google.accounts?.id) {
      google.accounts.id.prompt();
    }
  }

  return (
    <div className={`google-auth-wrapper ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
      <div ref={btnContainerRef} className="gsi-container" style={{ display: gsiRendered ? "block" : "none" }} />
      {!gsiRendered && (
        <button
          type="button"
          onClick={handleManualClick}
          className="google-btn-custom"
          aria-label={buttonText}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#ffffff",
            color: "#1f2937",
            border: "1px solid #d1d5db",
            borderRadius: "9999px",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{buttonText}</span>
        </button>
      )}
    </div>
  );
}
