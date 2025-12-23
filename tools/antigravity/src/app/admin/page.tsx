"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLogin() {
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            router.push("/admin/dashboard");
        } else {
            setError("Falsches Passwort.");
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[hsl(240,10%,4%)] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 text-purple-400">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white font-serif tracking-wide">Admin Access</h1>
                    <p className="text-sm text-gray-400 mt-2">Bitte authentifizieren</p>
                </div>

                <div className="flex flex-col gap-4">
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-4 rounded-xl bg-black/20 text-white border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors text-center tracking-widest"
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        autoFocus
                    />

                    {error && (
                        <div className="text-red-400 text-xs text-center font-bold bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-white text-black font-bold hover:bg-purple-50 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? "Checking..." : "Unlock"}
                    </button>
                </div>
            </div>
        </main>
    );
}
