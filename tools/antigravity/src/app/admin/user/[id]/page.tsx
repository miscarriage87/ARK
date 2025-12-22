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
}

const DEFAULT_CONFIG: AiConfig = {
    temperature: 1.15,
    modeWeights: { quote: 60, question: 30, pulse: 10 },
    customPrompt: ""
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
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab("config")}
                        className={`px-4 py-2 rounded-full font-bold ${activeTab === 'config' ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'}`}
                    >
                        AI Configuration
                    </button>
                    <button
                        onClick={() => setActiveTab("database")}
                        className={`px-4 py-2 rounded-full font-bold ${activeTab === 'database' ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'}`}
                    >
                        Database Inspector
                    </button>
                </div>
            </div>

            <h1 className="text-3xl font-serif mb-2">{user.name}</h1>
            <p className="text-gray-500 mb-8 font-mono text-sm">{userId}</p>

            {activeTab === "config" ? (
                <div className="grid gap-8">
                    {/* Prompt Preview */}
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-xl font-bold mb-4">Actual Prompt Preview</h3>
                        <div className="bg-black p-4 rounded text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-700">
                            {promptPreview}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Das ist der finale Prompt, der generiert wird.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        {/* Interests */}
                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                            <h3 className="text-xl font-bold mb-4">Interessen (Kategorien)</h3>
                            <div className="flex flex-wrap gap-2">
                                {INTERESTS_LIST.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => !isSafe && toggleInterest(tag)}
                                        className={`px-3 py-1 rounded-full text-sm border 
                                            ${interests.includes(tag) ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-600'}
                                            ${isSafe ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-white'}
                                        `}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-4">Wird in 'preferences' gespeichert. Max 3 empfohlen.</p>
                        </div>

                        {/* Weights */}
                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                            <h3 className="text-xl font-bold mb-4">Modus Gewichtung</h3>
                            <div className="grid gap-4">
                                <div className="flex justify-between items-center bg-black/50 p-2 rounded">
                                    <label>Quote</label>
                                    <input type="number" className="bg-transparent text-right w-16 focus:outline-none font-mono" value={config.modeWeights.quote} onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, quote: parseInt(e.target.value) } })} />
                                </div>
                                <div className="flex justify-between items-center bg-black/50 p-2 rounded">
                                    <label>Question</label>
                                    <input type="number" className="bg-transparent text-right w-16 focus:outline-none font-mono" value={config.modeWeights.question} onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, question: parseInt(e.target.value) } })} />
                                </div>
                                <div className="flex justify-between items-center bg-black/50 p-2 rounded">
                                    <label>Pulse</label>
                                    <input type="number" className="bg-transparent text-right w-16 focus:outline-none font-mono" value={config.modeWeights.pulse} onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, pulse: parseInt(e.target.value) } })} />
                                </div>
                            </div>
                            <div className={`mt-2 text-right text-xs ${totalWeight !== 100 ? 'text-red-400' : 'text-green-400'}`}>Total: {totalWeight}%</div>
                        </div>
                    </div>

                    {/* Temperature */}
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-xl font-bold mb-4">Temperatur: {config.temperature}</h3>
                        <input type="range" min="0" max="2" step="0.05" value={config.temperature} onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })} className="w-full accent-green-500" />
                    </div>

                    {/* Custom Prompt */}
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-xl font-bold mb-4">Custom Instructions (Inject)</h3>
                        <textarea
                            className="w-full h-32 font-mono text-sm leading-relaxed"
                            value={config.customPrompt}
                            onChange={e => setConfig({ ...config, customPrompt: e.target.value })}
                        />
                    </div>

                    {/* Controls */}
                    <div className="sticky bottom-8 bg-black/90 backdrop-blur border border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-2xl">
                        <button onClick={() => setIsSafe(!isSafe)} className={`flex items-center gap-2 ${isSafe ? 'text-green-500' : 'text-red-500'}`}>
                            {isSafe ? <Lock /> : <Unlock />}
                            <span className="text-xs uppercase font-bold tracking-wider">{isSafe ? "Locked" : "Editing"}</span>
                        </button>
                        <button disabled={isSafe} onClick={handleSave} className={`px-8 py-3 rounded bg-white text-black font-bold ${isSafe ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-200'}`}>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
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
        </main>
    );
}
