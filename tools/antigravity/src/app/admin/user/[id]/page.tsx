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

export default function UserAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [isSafe, setIsSafe] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();
    const [userId, setUserId] = useState<string>("");

    useEffect(() => {
        params.then(p => {
            setUserId(p.id);
            fetch(`/api/admin/user/${p.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.aiConfig) {
                        try {
                            const parsed = JSON.parse(data.aiConfig);
                            setConfig({ ...DEFAULT_CONFIG, ...parsed });
                        } catch (e) { console.error(e); }
                    }
                    setLoading(false);
                });
        });
    }, [params]);

    const handleSave = async () => {
        if (isSafe) return;
        setSaving(true);
        try {
            await fetch(`/api/admin/user/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aiConfig: JSON.stringify(config) })
            });
            alert("Gespeichert!");
            setIsSafe(true);
        } catch (e) {
            alert("Fehler");
        }
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-white">Lade...</div>;

    const totalWeight = (config.modeWeights.quote || 0) + (config.modeWeights.question || 0) + (config.modeWeights.pulse || 0);

    return (
        <main className="min-h-screen p-8 max-w-4xl mx-auto text-white">
            <button onClick={() => router.push('/admin/dashboard')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
                <ArrowLeft size={20} /> Zurück
            </button>

            <h1 className="text-3xl font-serif mb-2">AI Konfiguration</h1>
            <p className="text-gray-500 mb-8 font-mono text-sm">{userId}</p>

            <div className="grid gap-8">
                {/* Temperature */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-xl font-bold mb-4">Temperatur (Kreativität)</h3>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0" max="2" step="0.05"
                            value={config.temperature}
                            onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                            className="w-full accent-green-500"
                        />
                        <span className="font-mono text-xl w-16">{config.temperature}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">1.0 = Balance, 1.5+ = Sehr Kreativ/Chaos, 0.5 = Deterministisch</p>
                </div>

                {/* Weights */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-xl font-bold mb-4">Modus Gewichtung</h3>
                    <div className="grid gap-4">
                        <div className="flex justify-between">
                            <label>Quote (Klassisch)</label>
                            <input
                                type="number"
                                className="bg-black border border-gray-700 p-1 rounded w-20 text-right"
                                value={config.modeWeights.quote}
                                onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, quote: parseInt(e.target.value) } })}
                            />
                        </div>
                        <div className="flex justify-between">
                            <label>Question (Frage)</label>
                            <input
                                type="number"
                                className="bg-black border border-gray-700 p-1 rounded w-20 text-right"
                                value={config.modeWeights.question}
                                onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, question: parseInt(e.target.value) } })}
                            />
                        </div>
                        <div className="flex justify-between">
                            <label>Pulse (Impuls)</label>
                            <input
                                type="number"
                                className="bg-black border border-gray-700 p-1 rounded w-20 text-right"
                                value={config.modeWeights.pulse}
                                onChange={e => setConfig({ ...config, modeWeights: { ...config.modeWeights, pulse: parseInt(e.target.value) } })}
                            />
                        </div>
                    </div>
                    <div className={`mt-4 text-right text-sm ${totalWeight !== 100 ? 'text-yellow-500' : 'text-green-500'}`}>
                        Total: {totalWeight}% (Sollte 100 sein)
                    </div>
                </div>

                {/* Prompt */}
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-xl font-bold mb-4">Custom Prompt Instructions</h3>
                    <textarea
                        className="w-full h-48 bg-black border border-gray-700 rounded p-4 font-mono text-sm leading-relaxed"
                        placeholder="Zusätzliche Anweisungen für die KI..."
                        value={config.customPrompt}
                        onChange={e => setConfig({ ...config, customPrompt: e.target.value })}
                    />
                    <p className="text-sm text-gray-500 mt-2">Diese Anweisungen werden in den `system` Prompt injiziert.</p>
                </div>

                {/* Controls */}
                <div className="sticky bottom-8 bg-black/80 backdrop-blur border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSafe(!isSafe)}
                            className={`p-2 rounded-full ${isSafe ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
                        >
                            {isSafe ? <Lock size={20} /> : <Unlock size={20} />}
                        </button>
                        <span className="text-sm text-gray-400">
                            {isSafe ? "Gesperrt (Click to Edit)" : "Bearbeitung aktiv"}
                        </span>
                    </div>

                    <button
                        disabled={isSafe}
                        onClick={handleSave}
                        className={`px-8 py-3 rounded-full font-bold transition flex items-center gap-2
                            ${isSafe ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}
                        `}
                    >
                        <Save size={18} />
                        {saving ? "Speichere..." : "Speichern"}
                    </button>
                </div>
            </div>
        </main>
    );
}
