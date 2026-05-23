"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { getTopics, createTopic, type TopicResponse, type AuthState } from "@/lib/api";
import { loadClientSession } from "@/lib/session";
import { useSession } from "@/lib/useSession";

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface TopicContextType {
  topics: TopicResponse[];
  loading: boolean;
  addTopic: (name: string, description: string) => Promise<TopicResponse>;
  isAddTopicOpen: boolean;
  setIsAddTopicOpen: (open: boolean) => void;
  refreshTopics: () => Promise<void>;
}

const TopicContext = createContext<TopicContextType | undefined>(undefined);

export function TopicProvider({ children }: { children: ReactNode }) {
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  
  const { isLoggedIn } = useSession();

  const refreshTopics = useCallback(async () => {
    const session = loadClientSession(DEFAULT_API_BASE_URL);
    if (!session.accessToken) return;

    setLoading(true);
    try {
      const authState: AuthState = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      };
      const list = await getTopics(session.apiBaseUrl || DEFAULT_API_BASE_URL, authState);
      setTopics(list);
    } catch (err) {
      console.error("Failed to load topics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      void refreshTopics();
    } else {
      setTopics([]);
    }
  }, [isLoggedIn, refreshTopics]);

  const addTopic = useCallback(async (name: string, description: string) => {
    const session = loadClientSession(DEFAULT_API_BASE_URL);
    const authState: AuthState = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
    const newTopic = await createTopic(session.apiBaseUrl || DEFAULT_API_BASE_URL, authState, name, description);
    setTopics((prev) => [newTopic, ...prev]);
    return newTopic;
  }, []);

  return (
    <TopicContext.Provider value={{ topics, loading, addTopic, isAddTopicOpen, setIsAddTopicOpen, refreshTopics }}>
      {children}
    </TopicContext.Provider>
  );
}

export function useTopics() {
  const context = useContext(TopicContext);
  if (context === undefined) {
    throw new Error("useTopics must be used within a TopicProvider");
  }
  return context;
}
