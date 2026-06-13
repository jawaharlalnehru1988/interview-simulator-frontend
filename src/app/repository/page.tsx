"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RepositoryConfigPage() {
    const [url, setUrl] = useState("");
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const fetchAnalyses = async () => {
        try {
            const res = await fetch("/api/repository/analyze");
            if (res.ok) {
                const data = await res.json();
                setAnalyses(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchAnalyses();
        const interval = setInterval(fetchAnalyses, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;
        setLoading(true);
        try {
            const res = await fetch("/api/repository/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ githubUrl: url }),
            });
            if (res.ok) {
                const data = await res.json();
                setUrl("");
                router.push(`/repository/${data.id}`);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Repository AI Assistant</h1>
                    <p className="text-gray-400 mt-2 text-lg">Analyze any public GitHub repository to understand its architecture and ask questions about its code.</p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                    <h2 className="text-2xl font-semibold mb-4">Analyze a Repository</h2>
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://github.com/username/repository"
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? "Starting..." : "Analyze"}
                        </button>
                    </form>
                </div>

                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Previous Analyses</h2>
                    {analyses.length === 0 ? (
                        <p className="text-gray-500">No repositories analyzed yet.</p>
                    ) : (
                        <div className="grid gap-4">
                            {analyses.map((analysis) => (
                                <Link href={`/repository/${analysis.id}`} key={analysis.id}>
                                    <div className="bg-gray-900/30 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-all flex items-center justify-between group">
                                        <div>
                                            <h3 className="text-lg font-medium text-blue-400 group-hover:text-blue-300 transition-colors">{analysis.githubUrl}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Started: {new Date(analysis.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border
                                                ${analysis.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                  analysis.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                {analysis.status}
                                            </span>
                                            <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
