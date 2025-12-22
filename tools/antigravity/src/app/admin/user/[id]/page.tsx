"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock, Unlock, ArrowLeft } from "lucide-react";

interface AiConfig {
    temperature: number;
    modeWeights: {
        quote: number;
        question: number;
        pulse: number;
    };
    customPrompt: string;
    masterPrompt?: string;
}

const DEFAULT_CONFIG: AiConfig = {
    temperature: 1.15,
    modeWeights: { quote: 60, question: 30, pulse: 10 },
    customPrompt: "",
    masterPrompt: ""
};

const INTERESTS_LIST = ["Stoizismus", "Achtsamkeit", "Unternehmertum", "Wissenschaft", "Kunst", "Poesie", "Führung", "Wellness"];

export default function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const [user, setUser] = useState<any>(null);
    const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
    const [interests, setInterests] = useState<string[]>([]);
    const [promptPreview, setPromptPreview] = useState("");

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"config" | "database">("config");
    const [isSafe, setIsSafe] = useState(true);
    const [saving, setSaving] = useState(false);

    const router = useRouter();
    const [userId, setUserId] = useState<string>("");

    useEffect(() => {
        params.then(p => {
            setUserId(p.id);
            fetchData(p.id);
        });
    }, [params]);

    const fetchData = async (id: string) => {
        // Fetch User Data
        const res = await fetch(`/api/admin/user/${id}`);
        const data = await res.json();
        setUser(data);

        // Parse Config
        if (data.aiConfig) {
            try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(data.aiConfig) }); } catch (e) { }
        }

        // Parse Interests
        if (data.preferences) {
            try { setInterests(JSON.parse(data.preferences).interests || []); } catch (e) { }
        }

        // Fetch Prompt Preview
        fetch(`/api/admin/user/${id}/preview-prompt`).then(r => r.json()).then(d => setPromptPreview(d.prompt || ""));

        setLoading(false);
    };

    const handleSave = async () => {
        if (isSafe) return;
        setSaving(true);
        try {
            // Update AI Config AND Preferences (Interests)
            const preferences = user.preferences ? JSON.parse(user.preferences) : {};
            preferences.interests = interests;

            // First call matches original PUT (aiConfig only) - keeping for safety/backward compat
            await fetch(`/api/admin/user/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aiConfig: JSON.stringify(config) })
            });

            // Second call with updated structure (including preferences)
            await fetch(`/api/admin/user/${userId}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiConfig: JSON.stringify(config),
                    preferences: JSON.stringify(preferences)
                })
            });

            alert("Gespeichert!");
            setIsSafe(true);
            // Refresh preview
            fetch(`/api/admin/user/${userId}/preview-prompt`).then(r => r.json()).then(d => setPromptPreview(d.prompt));

        } catch (e) {
            alert("Fehler");
        }
        setSaving(false);
    };

    const toggleInterest = (i: string) => {
        setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
    };

    if (loading) return <div className="p-8 text-white">Lade...</div>;

    const totalWeight = (config.modeWeights.quote || 0) + (config.modeWeights.question || 0) + (config.modeWeights.pulse || 0);

    return (
        <main className="min-h-screen p-8 max-w-6xl mx-auto text-white">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => router.push('/admin/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white">
                    <ArrowLeft size={20} /> Dashboard
                </button>
                <div className="flex bg-gray-900/50 p-1 rounded-full border border-gray-800">
                    <button
                        onClick={() => setActiveTab("config")}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-gray-200 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        AI Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab("database")}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'database' ? 'bg-gray-200 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        Database Inspector
                    </button>
                </div>
            </div>

            <h1 className="text-4xl font-serif mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{user.name}</h1>
            <p className="text-gray-600 mb-10 font-mono text-xs uppercase tracking-widest">{userId}</p>

            {activeTab === "config" ? (
                <div className="grid gap-12">

                    {/* 1. INTERESSEN */}
                    <div className="bg-gray-900/40 p-8 rounded-3xl border border-gray-800 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-purple-500 pointer-events-none select-none">1</div>
                        <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-purple-500 text-black flex items-center justify-center text-sm font-bold">1</span>
                            Interessen
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {INTERESTS_LIST.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => !isSafe && toggleInterest(tag)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300
                                        ${interests.includes(tag)
                                            ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20 scale-105'
                                            : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-500 hover:bg-gray-800 hover:text-white'}
                                        ${isSafe ? 'cursor-not-allowed opacity-50 grayscale' : 'cursor-pointer'}
                                    `}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-4 ml-1">Wähle die Themenbereiche, die du priorisieren möchtest (Empfehlung: max 3).</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* 2. GEWICHTUNG */}
                        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-blue-500 pointer-events-none select-none">2</div>
                            <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-blue-500 text-black flex items-center justify-center text-sm font-bold">2</span>
                                Modus Gewichtung
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { id: 'quote', label: 'Quote', color: 'text-blue-400' },
                                    { id: 'question', label: 'Question', color: 'text-pink-400' },
                                    { id: 'pulse', label: 'Pulse', color: 'text-green-400' }
                                ].map(mode => (
                                    <div key={mode.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-gray-800">
                                        <label className={`font-bold ${mode.color}`}>{mode.label}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                disabled={isSafe}
                                                className={`bg-transparent text-right w-16 focus:outline-none font-mono text-lg font-bold ${isSafe ? 'text-gray-600' : 'text-white'}`}
                                                value={config.modeWeights[mode.id as keyof typeof config.modeWeights]}
                                                onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, [mode.id]: parseInt(e.target.value) || 0 } })}
                                            />
                                            <span className="text-gray-600">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={`mt-4 text-right font-mono text-sm ${totalWeight !== 100 ? 'text-red-400 animate-pulse' : 'text-green-500'}`}>
                                Total: {totalWeight}%
                            </div>
                        </div>

                        {/* 3. TEMPERATUR */}
                        <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-orange-500 pointer-events-none select-none">3</div>
                            <h3 className="text-2xl font-bold mb-2 text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-orange-500 text-black flex items-center justify-center text-sm font-bold">3</span>
                                Kreativität (Temp)
                            </h3>
                            <p className="text-gray-500 text-sm mb-8 h-10">
                                Bestimmt wie "kreativ" (aber auch risiko-freudig) die KI agiert.
                                <br />Niedrig = Konservativ, Hoch = Abstrakt.
                            </p>

                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-2xl font-mono font-bold text-orange-400">{config.temperature.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.05"
                                disabled={isSafe}
                                value={config.temperature}
                                onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${isSafe ? 'opacity-50' : ''}`}
                            />
                            <div className="flex justify-between text-xs text-gray-600 mt-2 font-mono uppercase">
                                <span>Präzise (0.0)</span>
                                <span>Standard (1.0)</span>
                                <span>Chaos (2.0)</span>
                            </div>
                        </div>
                    </div>

                    {/* 4. MASTER PROMPT */}
                    <div className="bg-black/40 p-8 rounded-3xl border border-gray-800 relative group">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center text-sm font-bold">4</span>
                                Master Prompt
                            </h3>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-gray-900 rounded text-xs text-purple-400 border border-purple-500/30">{"{{INTERESTS}}"}</span>
                                <span className="px-2 py-1 bg-gray-900 rounded text-xs text-blue-400 border border-blue-500/30">{"{{MODE}}"}</span>
                            </div>
                        </div>

                        <div className="relative">
                            <div className={`absolute inset-0 bg-red-500/5 z-10 rounded-xl border-2 border-red-500/10 pointer-events-none transition-all duration-500 ${isSafe ? 'opacity-100' : 'opacity-0 scale-105'}`} />
                            <textarea
                                className={`w-full h-[500px] font-mono text-sm leading-relaxed p-6 rounded-xl bg-black border transition-all duration-300 resize-none
                                    ${isSafe ? 'text-gray-600 border-gray-800' : 'text-gray-200 border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50'}
                                `}
                                value={config.masterPrompt || ""}
                                onChange={e => setConfig({ ...config, masterPrompt: e.target.value })}
                                disabled={isSafe}
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    {/* 5. PREVIEW */}
                    <div className="bg-gray-900/60 p-8 rounded-3xl border border-gray-700/50 backdrop-blur-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-400 uppercase tracking-widest text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live Preview Result
                        </h3>
                        <div className="bg-black p-6 rounded-xl font-mono text-xs text-green-400/90 whitespace-pre-wrap max-h-96 overflow-y-auto border border-white/10 shadow-inner">
                            {promptPreview}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 text-white font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Content</th>
                                <th className="p-4">Model</th>
                                <th className="p-4">Fav</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {user.views?.map((view: any) => (
                                <tr key={view.id} className="hover:bg-gray-800/50">
                                    <td className="p-4 font-mono text-xs whitespace-nowrap">{view.date}</td>
                                    <td className="p-4 text-white">
                                        <div className="font-serif text-lg leading-snug mb-1">{view.quote.content}</div>
                                        <div className="text-xs text-gray-500">{view.quote.author} • {view.quote.category}</div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-green-400">{view.quote.sourceModel}</td>
                                    <td className="p-4 text-center">
                                        {user.ratings.find((r: any) => r.quoteId === view.quoteId) ? "★" : "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sticky Save Bar (only in config mode) */}
            {activeTab === "config" && (
                <div className="sticky bottom-8 bg-black/90 backdrop-blur border border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-2xl mt-8">
                    <button onClick={() => setIsSafe(!isSafe)} className={`flex items-center gap-2 ${isSafe ? 'text-green-500' : 'text-red-500'}`}>
                        {isSafe ? <Lock /> : <Unlock />}
                        <span className="text-xs uppercase font-bold tracking-wider">{isSafe ? "Locked" : "Editing"}</span>
                    </button>
                    <button disabled={isSafe} onClick={handleSave} className={`px-8 py-3 rounded bg-white text-black font-bold ${isSafe ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-200'}`}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            )}
        </main>
    );
}
