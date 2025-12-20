"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");

  const go = () => {
    if (name.trim()) {
      router.push(`/${encodeURIComponent(name.trim())}`);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.intro}>
        <h1 className={styles.heroTitle}>ARK</h1>
        <p className={styles.heroSubtitle}>
          Dein digitaler Begleiter. Wie heißt du?
        </p>
      </div>

      <div className={styles.headerBar} style={{ flexDirection: 'column', gap: '1rem' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name eingeben..."
          className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg focus:outline-none focus:border-[hsl(var(--primary))]"
          style={{ color: 'white' }}
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        <button
          onClick={go}
          className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition"
        >
          Los geht's
        </button>
      </div>
    </main>
  );
}
