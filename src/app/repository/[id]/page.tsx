"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import RepositoryChat from "@/components/repository/RepositoryChat";

export default function AnalysisDashboardPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const res = await fetch(`/api/repository/analyze/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setAnalysis(data);
                    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                        setLoading(false);
                    } else {
                        // Polling if still analyzing
                        setTimeout(fetchAnalysis, 3000);
                    }
                } else {
                    router.push('/repository');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchAnalysis();
    }, [id, router]);

    if (!analysis) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-7xl mx-auto flex flex-col lg:h-[calc(100vh-4rem)] min-h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 gap-4">
                    <div>
                        <Link href="/repository" className="text-gray-400 hover:text-white flex items-center gap-2 mb-2 transition-colors w-fit">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Repositories
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold break-all">{analysis.githubUrl.replace("https://github.com/", "")}</h1>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold border w-fit
                        ${analysis.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          analysis.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'}`}>
                        {analysis.status === 'ANALYZING' ? 'ANALYZING (This may take a minute...)' : analysis.status}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col gap-6 lg:overflow-hidden pb-4">
                    {/* Summary Section */}
                    <div className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl p-6 sm:p-8 lg:overflow-y-auto backdrop-blur-sm shadow-xl custom-scrollbar min-h-[60vh] lg:h-full">
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Repository Summary
                        </h2>
                        
                        {loading && analysis.status === 'ANALYZING' ? (
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4"></div>
                                <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2"></div>
                                <div className="h-4 bg-gray-800 rounded animate-pulse w-5/6"></div>
                                <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3"></div>
                                <p className="text-gray-500 mt-8 italic">The AI is currently analyzing the repository structure...</p>
                            </div>
                        ) : analysis.summaryData ? (
                            <div className="prose prose-invert max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 break-words">
                                <ReactMarkdown>{analysis.summaryData}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-gray-500">No summary data available.</p>
                        )}
                    </div>
                </div>

                {/* Floating Chat Widget */}
                {analysis.status === 'COMPLETED' && (
                    <div className={`fixed right-6 z-50 flex flex-col items-end ${isChatOpen ? 'bottom-2' : 'bottom-24'}`}>
                        {isChatOpen && (
                            <div className="mb-2 w-[95vw] sm:w-[450px] h-[95vh] flex flex-col transition-all shadow-2xl">
                                <RepositoryChat analysisId={id} onClose={() => setIsChatOpen(false)} />
                            </div>
                        )}
                        {!isChatOpen && (
                            <button 
                                onClick={() => setIsChatOpen(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center justify-center animate-bounce shadow-blue-500/30 border border-blue-400/30"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #374151;
                    border-radius: 20px;
                }
            `}</style>
        </div>
    );
}
