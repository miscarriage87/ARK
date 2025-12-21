"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css"; // Reuse home styles for consistency

export default function AdminLogin() {
    const [password, setPassword] = useState("");
    const router = useRouter();
    const [error, setError] = useState("");

    const handleLogin = async () => {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });
        if (res.ok) {
            router.push("/admin/dashboard");
        } else {
            setError("Falsches Passwort.");
        }
    };

    return (
        <main className={styles.main}>
            <div className={styles.intro}>
                <h1 className={styles.heroTitle} style={{ fontSize: '2rem' }}>Admin Access</h1>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Passwort"
                    className="p-3 rounded bg-gray-800 text-white border border-gray-700"
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
                {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                <button
                    onClick={handleLogin}
                    className="p-3 rounded bg-white text-black font-bold hover:bg-gray-200"
                >
                    Login
                </button>
            </div>
        </main>
    );
}
