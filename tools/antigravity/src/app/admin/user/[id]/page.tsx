"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock, Unlock, ArrowLeft, Sparkles, Database } from "lucide-react";

// Predefined available interests for the UI
const INTERESTS_LIST = ["Achtsamkeit", "Spiritualität", "Stoizismus", "Unternehmertum", "Wissenschaft", "Kunst", "Poesie", "Führung", "Wellness"];

export default function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const [user, setUser] = useState<any>(null);
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
            const data = await res.json();
            setUser(data);

            if (data.preferences) {
                try {
                    setInterests(JSON.parse(data.preferences).interests || []);
                } catch (e) {
                    console.error("Failed to parse preferences", e);
                }
            }
        } catch (e) {
            console.error("Failed to fetch user data", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (isSafe) return;
        setSaving(true);
        try {
            // Construct preferences object (preserve existing fields if any, though interests is main one)
            const currentPrefs = user.preferences ? JSON.parse(user.preferences) : {};
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
        } catch (e) {
            alert("Error saving data");
        }
        setSaving(false);
    };

    const toggleInterest = (i: string) => {
        if (interests.includes(i)) {
            setInterests(prev => prev.filter(x => x !== i));
        } else {
            if (interests.length >= 3) {
                alert("Maximum 3 interests allowed!");
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
                            {INTERESTS_LIST.map(tag => (
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
                        <p className="text-xs text-gray-500 mt-4">Selected: {interests.length} / 3</p>
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
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-black/40 text-gray-300 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Category & Model</th>
                                    <th className="p-4">Content</th>
                                    <th className="p-4 w-48">Concepts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {user?.views?.map((view: any) => (
                                    <tr key={view.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-mono text-xs whitespace-nowrap align-top text-gray-500">{view.date}</td>
                                        <td className="p-4 align-top w-40">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded w-fit">
                                                    {view.quote.category || "-"}
                                                </span>
                                                <span className="text-[11px] font-mono text-gray-500 bg-black/30 px-2 py-0.5 rounded w-fit border border-white/5">
                                                    {view.quote.sourceModel}
                                                </span>
                                                {view.quote.author && (
                                                    <span className="text-[11px] text-gray-400 italic mt-1">
                                                        {view.quote.author}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-white align-top max-w-lg">
                                            <div className="serif text-base leading-relaxed text-gray-200 mb-2">
                                                "{view.quote.content}"
                                            </div>
                                            {view.quote.explanation && (
                                                <div className="text-[11px] text-gray-500 pl-2 border-l-2 border-white/10">
                                                    {view.quote.explanation}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top text-xs font-mono text-gray-500">
                                            {view.quote.concepts ? (
                                                <div className="flex flex-col gap-1">
                                                    {(() => {
                                                        try {
                                                            const c = JSON.parse(view.quote.concepts);
                                                            return Array.isArray(c) ? c.map((i: any, idx: number) => (
                                                                <span key={idx} className="block text-purple-400/80">• {i.word}</span>
                                                            )) : <span className="text-red-500">Invalid JSON</span>;
                                                        } catch (e) { return <span className="text-gray-600">{view.quote.concepts}</span>; }
                                                    })()}
                                                </div>
                                            ) : <span className="opacity-20">-</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
