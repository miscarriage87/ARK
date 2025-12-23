"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Lock, Unlock, ArrowLeft, Eye, Edit3, Code, Sparkles, Database } from "lucide-react";

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
    modeWeights: { quote: 50, question: 30, pulse: 20 },
    customPrompt: "",
    masterPrompt: ""
};

const DEFAULT_MASTER_PROMPT = `Handele als 'Soul-Coach' (inspiriert von Veit Lindau).
Das heutige Format ist: {{MODE}}.

Der Nutzer interessiert sich für: {{INTERESTS}}.
Wähle ein Thema davon.

ANWEISUNGEN FÜR {{MODE}}:
{{MODE_INSTRUCTIONS}}

ANALYSE (für alle Formate):
- Analysiere den Text auf schwierige/spannende Begriffe (Fremdwörter, Konzepte).
- Identifiziere 1-3 Begriff, die IM TEXT vorkommen.
- Falls der Text einfach ist, lass "concepts" leer.

Output JSON:
{
  "content": "Text des Zitats/Frage/Impuls",
  "author": "Name oder 'Reflexion'/'Impuls'",
  "explanation": "Kurze Deutung oder Coaching-Hinweis dazu (2-3 Sätze).",
  "category": "Kategorie (Ein Wort)",
  "concepts": [ { "word": "Begriff", "definition": "Erklärung" } ] 
}`;

const INTERESTS_LIST = ["Achtsamkeit", "Spiritualität", "Stoizismus", "Unternehmertum", "Wissenschaft", "Kunst", "Poesie", "Führung", "Wellness"];

export default function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const [user, setUser] = useState<any>(null);
    const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
    const [interests, setInterests] = useState<string[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<"config" | "database">("config");
    const [promptMode, setPromptMode] = useState<"edit" | "preview">("edit");
    const [compiledPrompt, setCompiledPrompt] = useState<string>("");

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

    // Fetch compiled preview when switching to preview tab
    useEffect(() => {
        if (promptMode === "preview" && userId) {
            fetch(`/api/admin/user/${userId}/preview-prompt`)
                .then(res => res.json())
                .then(data => setCompiledPrompt(data.prompt || "Error loading preview"))
                .catch(() => setCompiledPrompt("Error connecting to API"));
        }
    }, [promptMode, userId]);

    const fetchData = async (id: string) => {
        const res = await fetch(`/api/admin/user/${id}`);
        const data = await res.json();
        setUser(data);

        if (data.aiConfig) {
            try {
                const parsed = JSON.parse(data.aiConfig);
                if (!parsed.masterPrompt) parsed.masterPrompt = DEFAULT_MASTER_PROMPT;
                setConfig({ ...DEFAULT_CONFIG, ...parsed });
            } catch (e) { }
        } else {
            setConfig(prev => ({ ...prev, masterPrompt: DEFAULT_MASTER_PROMPT }));
        }

        if (data.preferences) {
            try { setInterests(JSON.parse(data.preferences).interests || []); } catch (e) { }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (isSafe) return;
        setSaving(true);
        try {
            const preferences = user.preferences ? JSON.parse(user.preferences) : {};
            preferences.interests = interests;

            await fetch(`/api/admin/user/${userId}`, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiConfig: JSON.stringify(config),
                    preferences: JSON.stringify(preferences)
                })
            });

            alert("Saved Successfully");
            setIsSafe(true);
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
            <Sparkles className="animate-spin text-purple-500 mr-2" /> Initialize...
        </div>
    );

    const totalWeight = (config.modeWeights.quote || 0) + (config.modeWeights.question || 0) + (config.modeWeights.pulse || 0);

    return (
        <main className="min-h-screen bg-[hsl(240,10%,4%)] text-white font-sans selection:bg-purple-500/30">
            {/* Top Bar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/5 py-4 px-8 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push('/admin/dashboard')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} className="text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold font-serif tracking-wide">{user.name}</h1>
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                            <span>ID: {userId.substring(0, 8)}...</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                            <span className={isSafe ? "text-green-500" : "text-amber-500"}>{isSafe ? "LOCKED" : "EDITING"}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                        <button
                            onClick={() => setActiveTab("config")}
                            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'config' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Configuration
                        </button>
                        <button
                            onClick={() => setActiveTab("database")}
                            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'database' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Database
                        </button>
                    </div>

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

            <div className="p-8 max-w-[1600px] mx-auto">
                {activeTab === "config" ? (
                    <div className="grid grid-cols-12 gap-8 h-[calc(100vh-140px)]">

                        {/* LEFT COLUMN: SETTINGS */}
                        <div className="col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">

                            {/* Interests Card */}
                            <section className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
                                    <Sparkles size={18} /> Interests
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {INTERESTS_LIST.map(tag => (
                                        <div key={tag} className="flex flex-col items-center">
                                            <button
                                                onClick={() => !isSafe && toggleInterest(tag)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                                                    ${interests.includes(tag)
                                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}
                                                    ${isSafe && 'cursor-not-allowed opacity-60'}
                                                    ${!isSafe && interests.length >= 3 && !interests.includes(tag) ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                                                `}
                                            >
                                                {tag}
                                            </button>
                                            {tag === "Stoizismus" && (
                                                <span className="text-[10px] text-gray-500 mt-1 italic whitespace-nowrap">Gelassenheit durch Vernunft</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-4">Selected: {interests.length}/3</p>
                            </section>

                            {/* Weights Card */}
                            <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-300">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Mode Weights
                                </h3>

                                <div className="space-y-5">
                                    {[
                                        { id: 'quote', label: 'Quote', color: 'bg-blue-500', text: 'text-blue-400' },
                                        { id: 'question', label: 'Question', color: 'bg-pink-500', text: 'text-pink-400' },
                                        { id: 'pulse', label: 'Pulse', color: 'bg-emerald-500', text: 'text-emerald-400' }
                                    ].map(mode => (
                                        <div key={mode.id}>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className={`font-bold ${mode.text}`}>{mode.label}</span>
                                                <span className="font-mono">{config.modeWeights[mode.id as keyof typeof config.modeWeights]}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
                                                <div
                                                    className={`absolute top-0 left-0 h-full ${mode.color} transition-all duration-500`}
                                                    style={{ width: `${config.modeWeights[mode.id as keyof typeof config.modeWeights]}%` }}
                                                />
                                                <input
                                                    type="range"
                                                    min="0" max="100" step="10"
                                                    disabled={isSafe}
                                                    value={config.modeWeights[mode.id as keyof typeof config.modeWeights]}
                                                    onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, [mode.id]: parseInt(e.target.value) || 0 } })}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className={`text-right text-xs font-mono mt-4 ${totalWeight !== 100 ? 'text-red-400' : 'text-gray-500'}`}>
                                    Total Distribution: {totalWeight}%
                                </div>
                            </section>

                            {/* Temperature Card */}
                            <section className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-orange-300">
                                    Createvity (Temp)
                                </h3>
                                <div className="flex items-end justify-between mb-4">
                                    <div className="text-3xl font-mono font-bold text-white">{config.temperature.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">
                                        {config.temperature < 0.5 ? "Strict" : config.temperature > 1.2 ? "Abstract" : "Balanced"}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="2" step="0.05"
                                    disabled={isSafe}
                                    value={config.temperature}
                                    onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </section>
                        </div>

                        {/* RIGHT COLUMN: MASTER PROMPT */}
                        <div className="col-span-8 flex flex-col h-full bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative">
                            {/* Prompt Tab Bar */}
                            <div className="flex border-b border-white/10 bg-white/5">
                                <button
                                    onClick={() => setPromptMode("edit")}
                                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${promptMode === 'edit' ? 'text-white bg-white/5 border-b-2 border-purple-500' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Edit3 size={16} /> Template Editor
                                </button>
                                <button
                                    onClick={() => setPromptMode("preview")}
                                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${promptMode === 'preview' ? 'text-green-400 bg-green-500/5 border-b-2 border-green-500' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Eye size={16} /> Compiled Preview
                                </button>
                            </div>

                            <div className="flex-1 relative group">
                                {promptMode === "edit" ? (
                                    <>
                                        {/* Variables Reference */}
                                        <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                                            <div className="group/tooltip relative px-3 py-1 bg-gray-900 rounded border border-gray-700 text-xs font-mono text-gray-400 cursor-help">
                                                {"{{MODE_INSTRUCTIONS}}"}
                                                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-xs text-gray-300 hidden group-hover/tooltip:block z-50">
                                                    Injects mode-specific rules for Quote, Question, or Pulse.
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-gray-900 rounded border border-gray-700 text-xs font-mono text-gray-400 cursor-help">
                                                {"{{INTERESTS}}"}
                                            </div>
                                        </div>

                                        <textarea
                                            className={`w-full h-full bg-transparent p-8 font-mono text-sm leading-relaxed resize-none focus:outline-none transition-colors
                                                ${isSafe ? 'text-gray-500' : 'text-gray-200'}
                                            `}
                                            value={config.masterPrompt || ""}
                                            onChange={e => setConfig({ ...config, masterPrompt: e.target.value })}
                                            disabled={isSafe}
                                            spellCheck={false}
                                        />
                                    </>
                                ) : (
                                    <div className="w-full h-full p-8 font-mono text-sm text-green-300/80 leading-relaxed overflow-y-auto whitespace-pre-wrap bg-black/20">
                                        {compiledPrompt}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                ) : (
                    /* DATABASE TAB */
                    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-black/40 text-gray-300 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-6">Date</th>
                                    <th className="p-6">Content</th>
                                    <th className="p-6">Model</th>
                                    <th className="p-6 text-center">Liked</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {user.views?.map((view: any) => (
                                    <tr key={view.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 font-mono text-xs whitespace-nowrap align-top">{view.date}</td>
                                        <td className="p-6 text-white align-top">
                                            <div className="font-serif text-xl leading-relaxed mb-2 text-gray-200">{view.quote.content}</div>
                                            <div className="flex gap-3 text-xs text-gray-500 font-bold tracking-wider uppercase">
                                                <span className="text-purple-400">{view.quote.category}</span>
                                                <span>•</span>
                                                <span>{view.quote.author}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 font-mono text-xs text-gray-500 align-top">{view.quote.sourceModel}</td>
                                        <td className="p-6 text-center align-top">
                                            {user.ratings.find((r: any) => r.quoteId === view.quoteId) && (
                                                <span className="text-xl text-yellow-500 animate-pulse">★</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}

