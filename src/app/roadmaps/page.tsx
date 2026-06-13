"use client";

import { useState, useEffect } from "react";

import { 
  createDefaultSession, 
  loadClientSession, 
  saveClientSession, 
  type ClientSession 
} from "@/lib/session";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";
import { 
  getPublicRoadmaps, 
  getPublicRoadmapDetails, 
  explainRoadmapSubtopic,
  RoadmapItem,
  RoadmapChapterItem,
  RoadmapSubtopicItem 
} from "@/lib/api";
import ReactMarkdown from "react-markdown";

export default function RoadmapsPage() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<ClientSession>(() =>
    createDefaultSession(DEFAULT_API_BASE_URL)
  );

  useEffect(() => {
    setSession(loadClientSession(DEFAULT_API_BASE_URL));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveClientSession(session);
  }, [ready, session]);

  const [roadmaps, setRoadmaps] = useState<RoadmapItem[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<RoadmapItem | null>(null);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState("");
  const [activeSubtopic, setActiveSubtopic] = useState<RoadmapSubtopicItem | null>(null);
  const [explainedSubtopics, setExplainedSubtopics] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (ready && session?.apiBaseUrl) {
      getPublicRoadmaps(session.apiBaseUrl).then(data => setRoadmaps(data)).catch(console.error);
    }
  }, [ready, session]);

  async function handleSelectRoadmap(roadmap: RoadmapItem) {
    if (!session?.apiBaseUrl) return;
    try {
      const details = await getPublicRoadmapDetails(session.apiBaseUrl, roadmap.id);
      setActiveRoadmap(details);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleExplain(subtopic: RoadmapSubtopicItem) {
    if (!activeRoadmap || !session?.apiBaseUrl) return;
    setActiveSubtopic(subtopic);
    setDrawerOpen(true);

    if (subtopic.explanation) {
      setExplanationText(subtopic.explanation);
      return;
    }

    setLoadingExplanation(true);
    setExplanationText("");
    try {
      const res = await explainRoadmapSubtopic(session.apiBaseUrl, subtopic.id);
      setExplanationText(res.explanation);
      
      setActiveRoadmap(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chapters: (prev.chapters || []).map(c => ({
            ...c,
            subtopics: c.subtopics.map(s => 
              s.id === subtopic.id ? { ...s, explanation: res.explanation } : s
            )
          }))
        };
      });
      
      setExplainedSubtopics(prev => {
        const next = new Set(prev);
        next.add(subtopic.id);
        return next;
      });
    } catch (e) {
      setExplanationText("Failed to load explanation.");
    } finally {
      setLoadingExplanation(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar List */}
      <div className="w-full md:w-1/3 space-y-4">
        <h2 className="text-2xl font-bold">Available Roadmaps</h2>
        <div className="flex flex-col gap-3">
          {roadmaps.map((rm: RoadmapItem) => (
            <button
              key={rm.id}
              onClick={() => handleSelectRoadmap(rm)}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeRoadmap?.id === rm.id ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <h3 className="font-semibold text-lg">{rm.mainTopic}</h3>
            </button>
          ))}
          {roadmaps.length === 0 && <p className="text-slate-500">No roadmaps available yet.</p>}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full md:w-2/3">
        {activeRoadmap ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h1 className="text-3xl font-black text-slate-900 mb-8">{activeRoadmap.mainTopic} Roadmap</h1>
            
            <div className="space-y-6">
              {activeRoadmap.chapters?.map((chapter: RoadmapChapterItem, i: number) => (
                <div key={chapter.id} className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800 mb-4">
                    Chapter {i + 1}: {chapter.chapterName}
                  </h2>
                  <ul className="space-y-3">
                    {chapter.subtopics.map((subtopic: RoadmapSubtopicItem) => (
                      <li key={subtopic.id} className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                        <span className="font-medium text-slate-700">{subtopic.subtopicName}</span>
                        <button
                          onClick={() => handleExplain(subtopic)}
                          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                            subtopic.explanation || explainedSubtopics.has(subtopic.id)
                              ? 'bg-green-50 text-green-600 hover:bg-green-100'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                        >
                          {subtopic.explanation || explainedSubtopics.has(subtopic.id) ? 'Read' : 'Explain'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 p-12 border-2 border-dashed rounded-2xl">
            Select a roadmap from the left to view its chapters.
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && activeSubtopic && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)}></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 md:pl-16">
              <div className="pointer-events-auto w-screen max-w-2xl transform transition ease-in-out duration-500">
                <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl border-l border-slate-100">
                  
                  <div className="bg-slate-900 px-6 py-6 sm:px-8 flex items-center justify-between shadow-md">
                    <h2 className="text-xl font-black text-white tracking-tight" id="slide-over-title">
                      {activeSubtopic.subtopicName}
                    </h2>
                    <button type="button" className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus:outline-none" onClick={() => setDrawerOpen(false)}>
                      <span className="sr-only">Close panel</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="relative flex-1 px-6 py-8 sm:px-8">
                    {loadingExplanation ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                        <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p>Generating expert explanation...</p>
                      </div>
                    ) : (
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{explanationText}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
