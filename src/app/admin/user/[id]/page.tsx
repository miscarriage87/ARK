"use client";
import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock, Unlock, ArrowLeft, Sparkles, Database } from "lucide-react";
import { INTERESTS, MAX_INTERESTS } from "@/lib/constants";
import { safeJsonParse } from "@/lib/utils";

type AdminConcept = {
    word?: string;
    definition?: string;
};

type AdminQuote = {
    id: number;
    content: string;
    author: string | null;
    explanation: string | null;
    category: string | null;
    sourceModel: string | null;
    concepts: string | null;
    mode: string | null;
    format: string | null;
    perspective: string | null;
    tone: string | null;
    imageryWorld: string | null;
    rhetoricalDevice: string | null;
    timeHorizon: string | null;
    actionType: string | null;
    difficulty: string | null;
    promptVersion: string | null;
    provider: string | null;
    noveltyScore: number | null;
    generationTrace: string | null;
};

type AdminView = {
    id: number;
    date: string;
    quote: AdminQuote;
};

type AdminUser = {
    id: string;
    name: string;
    preferences: string | null;
    views: AdminView[];
};

type UserPreferences = {
    interests?: string[];
};

type GenerationScore = {
    score?: number;
    semanticNovelty?: number;
    maxSimilarity?: number;
    reasons?: string[];
};

type GenerationCandidateTrace = {
    lane?: string;
    model?: string;
    score?: number;
    reasons?: string[];
};

type GenerationTrace = {
    promptVersion?: string;
    selectedLane?: string;
    selectedScore?: GenerationScore;
    candidates?: GenerationCandidateTrace[];
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function formatEngineNumber(value: unknown, digits = 2): string | null {
    return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : null;
}

function displayValue(value: string | null | undefined): string | null {
    return isNonEmptyString(value) ? value.replaceAll("-", " ") : null;
}

function parseGenerationTrace(trace: string | null): GenerationTrace | null {
    if (!trace) return null;
    const parsed = safeJsonParse<unknown>(trace, null);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as GenerationTrace : null;
}

function parseConcepts(concepts: string | null): AdminConcept[] {
    if (!concepts) return [];
    const parsed = safeJsonParse<unknown>(concepts, []);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((concept): concept is AdminConcept => (
        concept !== null
        && typeof concept === "object"
        && "word" in concept
        && isNonEmptyString((concept as AdminConcept).word)
    ));
}

function MetaBadge({
    label,
    children,
    className = ""
}: {
    label?: string;
    children: ReactNode;
    className?: string;
}) {
    if (children === null || children === undefined || children === "") return null;

    return (
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] leading-none ${className}`}>
            {label && <span className="text-gray-500">{label}</span>}
            <span>{children}</span>
        </span>
    );
}

export default function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [interests, setInterests] = useState<string[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [isSafe, setIsSafe] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string>("");

    const router = useRouter();

    useEffect(() => {
        params.then(p => {
            setUserId(p.id);
            fetchData(p.id);
        });
    }, [params]);

    const fetchData = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/user/${id}`);
            const data = await res.json() as AdminUser;
            setUser(data);

            if (data.preferences) {
                const prefs = safeJsonParse<UserPreferences>(data.preferences, {});
                setInterests(Array.isArray(prefs.interests) ? prefs.interests : []);
            }
        } catch (e) {
            console.error("Failed to fetch user data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (isSafe) return;
        if (!user) return;
        setSaving(true);
        try {
            // Construct preferences object (preserve existing fields if any, though interests is main one)
            const currentPrefs = safeJsonParse<UserPreferences>(user.preferences, {});
            const updatedPreferences = {
                ...currentPrefs,
                interests: interests
            };

            await fetch(`/api/admin/user/${userId}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Only updating preferences. AI Config is now system-managed or read-only.
                    preferences: JSON.stringify(updatedPreferences)
                })
            });

            alert("Saved Successfully");
            setIsSafe(true);

            // Refresh local data
            fetchData(userId);
        } catch {
            alert("Error saving data");
        }
        setSaving(false);
    };

    const toggleInterest = (i: string) => {
        if (interests.includes(i)) {
            setInterests(prev => prev.filter(x => x !== i));
        } else {
            if (interests.length >= MAX_INTERESTS) {
                alert(`Maximum ${MAX_INTERESTS} interests allowed!`);
                return;
            }
            setInterests(prev => [...prev, i]);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono">
            <Sparkles className="animate-spin text-purple-500 mr-2" /> Loading User Data...
        </div>
    );

    return (
        <main className="min-h-screen bg-[hsl(240,10%,4%)] text-white font-sans selection:bg-purple-500/30">
            {/* Top Bar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/5 py-4 px-8 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} className="text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold font-serif tracking-wide">{user?.name}</h1>
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                            <span>ID: {userId}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSafe(!isSafe)}
                        className={`p-2 rounded-xl border transition-all ${isSafe ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-amber-500/30 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'}`}
                    >
                        {isSafe ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>

                    <button
                        disabled={isSafe}
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm transition-all ${isSafe ? 'opacity-30 cursor-not-allowed bg-gray-800 text-gray-400' : 'bg-white text-black hover:bg-gray-200 hover:scale-105 shadow-xl shadow-white/10'}`}
                    >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </header>

            <div className="p-8 max-w-[1600px] mx-auto grid grid-cols-12 gap-8">

                {/* LEFT COLUMN: BASIC INFO & INTERESTS */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
                    <section className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
                            <Sparkles size={18} /> Interests (Preferences)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {INTERESTS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => !isSafe && toggleInterest(tag)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                        ${interests.includes(tag)
                                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}
                                        ${isSafe && 'cursor-not-allowed opacity-60'}
                                    `}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-4">Selected: {interests.length} / {MAX_INTERESTS}</p>
                    </section>
                </div>

                {/* RIGHT COLUMN: DATABASE VIEW */}
                <div className="col-span-12 xl:col-span-8 bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-blue-300">
                            <Database size={18} /> History & Database
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-[1180px] w-full text-left text-sm text-gray-400">
                            <thead className="bg-black/40 text-gray-300 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Engine</th>
                                    <th className="p-4">Plan</th>
                                    <th className="p-4">Content</th>
                                    <th className="p-4 w-72">Trace & Concepts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {user?.views?.map((view) => {
                                    const trace = parseGenerationTrace(view.quote.generationTrace);
                                    const concepts = parseConcepts(view.quote.concepts);
                                    const selectedScore = trace?.selectedScore;
                                    const score = formatEngineNumber(selectedScore?.score ?? view.quote.noveltyScore);
                                    const semanticNovelty = formatEngineNumber(selectedScore?.semanticNovelty);
                                    const maxSimilarity = formatEngineNumber(selectedScore?.maxSimilarity);
                                    const candidates = trace?.candidates || [];
                                    const reasons = selectedScore?.reasons?.slice(0, 3) || [];

                                    return (
                                        <tr key={view.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4 font-mono text-xs whitespace-nowrap align-top text-gray-500">{view.date}</td>
                                            <td className="p-4 align-top w-56">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <MetaBadge className="border-white/10 bg-black/40 font-mono text-gray-200">
                                                        {view.quote.sourceModel || "legacy"}
                                                    </MetaBadge>
                                                    <MetaBadge label="provider" className="border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
                                                        {view.quote.provider}
                                                    </MetaBadge>
                                                    <MetaBadge label="prompt" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                                                        {view.quote.promptVersion || trace?.promptVersion}
                                                    </MetaBadge>
                                                    <MetaBadge label="mode" className="border-white/10 bg-white/5 text-white">
                                                        {view.quote.mode}
                                                    </MetaBadge>
                                                    <MetaBadge label="lane" className="border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200">
                                                        {trace?.selectedLane}
                                                    </MetaBadge>
                                                    <MetaBadge label="score" className="border-green-500/20 bg-green-500/10 font-mono text-green-200">
                                                        {score}
                                                    </MetaBadge>
                                                    {candidates.length > 0 && (
                                                        <MetaBadge label="candidates" className="border-amber-500/20 bg-amber-500/10 font-mono text-amber-200">
                                                            {candidates.length}
                                                        </MetaBadge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 align-top w-64">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <MetaBadge label="category" className="border-purple-500/20 bg-purple-500/10 text-purple-200">
                                                        {view.quote.category}
                                                    </MetaBadge>
                                                    <MetaBadge label="format" className="border-blue-500/20 bg-blue-500/10 text-blue-200">
                                                        {displayValue(view.quote.format)}
                                                    </MetaBadge>
                                                    <MetaBadge label="tone" className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                                                        {displayValue(view.quote.tone)}
                                                    </MetaBadge>
                                                    <MetaBadge label="world" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                                                        {displayValue(view.quote.imageryWorld)}
                                                    </MetaBadge>
                                                    <MetaBadge label="device" className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                                                        {displayValue(view.quote.rhetoricalDevice)}
                                                    </MetaBadge>
                                                    <MetaBadge label="view" className="border-sky-500/20 bg-sky-500/10 text-sky-200">
                                                        {displayValue(view.quote.perspective)}
                                                    </MetaBadge>
                                                    <MetaBadge label="horizon" className="border-teal-500/20 bg-teal-500/10 text-teal-200">
                                                        {displayValue(view.quote.timeHorizon)}
                                                    </MetaBadge>
                                                    <MetaBadge label="action" className="border-lime-500/20 bg-lime-500/10 text-lime-200">
                                                        {displayValue(view.quote.actionType)}
                                                    </MetaBadge>
                                                    <MetaBadge label="difficulty" className="border-orange-500/20 bg-orange-500/10 text-orange-200">
                                                        {displayValue(view.quote.difficulty)}
                                                    </MetaBadge>
                                                </div>
                                            </td>
                                            <td className="p-4 text-white align-top max-w-lg">
                                                <div className="serif text-base leading-relaxed text-gray-200 mb-2">
                                                    &ldquo;{view.quote.content}&rdquo;
                                                </div>
                                                {view.quote.author && (
                                                    <div className="text-[11px] text-gray-400 italic mb-2">
                                                        {view.quote.author}
                                                    </div>
                                                )}
                                                {view.quote.explanation && (
                                                    <div className="text-[11px] text-gray-500 pl-2 border-l-2 border-white/10">
                                                        {view.quote.explanation}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 align-top text-xs font-mono text-gray-500">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <MetaBadge label="semantic" className="border-green-500/20 bg-green-500/10 text-green-200">
                                                            {semanticNovelty}
                                                        </MetaBadge>
                                                        <MetaBadge label="similarity" className="border-red-500/20 bg-red-500/10 text-red-200">
                                                            {maxSimilarity}
                                                        </MetaBadge>
                                                    </div>

                                                    {candidates.length > 0 && (
                                                        <div className="space-y-1">
                                                            {candidates.slice(0, 4).map((candidate, index) => (
                                                                <div key={`${candidate.lane || "candidate"}-${index}`} className="rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
                                                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                                                        <span className="text-gray-300">{candidate.lane || `candidate ${index + 1}`}</span>
                                                                        <span className="text-gray-600">{candidate.model || "-"}</span>
                                                                        <span className="text-green-300">{formatEngineNumber(candidate.score) || "-"}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {reasons.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {reasons.map((reason) => (
                                                                <span key={reason} className="rounded bg-white/5 px-2 py-1 text-[10px] text-gray-400">
                                                                    {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {concepts.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {concepts.map((concept, index) => (
                                                                <span key={`${concept.word}-${index}`} className="rounded bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300">
                                                                    {concept.word}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="opacity-20">No concepts</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
