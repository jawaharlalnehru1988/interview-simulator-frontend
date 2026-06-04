"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/useSession";
import { sendChatMessage, type ChatMessage } from "@/lib/api";

export default function FloatingChatbot() {
  const { session, isLoggedIn } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    if (isLoggedIn) {
      const stored = sessionStorage.getItem("chatbot_history");
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse chatbot history");
        }
      } else {
        setMessages([
          { role: "assistant", content: "Hi! How can I help you today?" },
        ]);
      }
    }
  }, [isLoggedIn]);

  // Save to sessionStorage on change
  useEffect(() => {
    if (isLoggedIn && messages.length > 0) {
      sessionStorage.setItem("chatbot_history", JSON.stringify(messages));
    }
  }, [messages, isLoggedIn]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  if (!isLoggedIn) {
    return null; // Don't show if not logged in
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const authState = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      };
      const response = await sendChatMessage(session.apiBaseUrl, authState, {
        messages: newMessages,
      });

      setMessages([
        ...newMessages,
        { role: "assistant", content: response.response },
      ]);
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, I encountered an error." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "var(--accent)",
          color: "white",
          border: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "350px",
            height: "500px",
            maxHeight: "calc(100vh - 120px)",
            backgroundColor: "var(--surface)",
            borderRadius: "16px",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            overflow: "hidden",
            backdropFilter: "blur(18px)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px",
              backgroundColor: "var(--accent)",
              color: "white",
              fontWeight: "bold",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>AI Assistant</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? "var(--accent)" : "var(--surface-strong)",
                  color: msg.role === "user" ? "white" : "var(--ink)",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: msg.role === "user" ? "none" : "1px solid var(--line)",
                  maxWidth: "85%",
                  wordWrap: "break-word",
                  fontSize: "0.95rem",
                  lineHeight: "1.4",
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: "0.9rem" }}>
                Typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              gap: "8px",
              backgroundColor: "var(--surface-strong)",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "20px",
                border: "1px solid var(--line)",
                outline: "none",
                backgroundColor: "var(--surface)",
                color: "var(--ink)",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: (isLoading || !input.trim()) ? "not-allowed" : "pointer",
                opacity: (isLoading || !input.trim()) ? 0.6 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
