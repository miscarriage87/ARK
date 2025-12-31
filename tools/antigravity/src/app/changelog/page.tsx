"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ChangelogPage() {
    const router = useRouter();

    const changes = [
        {
            version: "v1.1",
            date: "31. Dezember 2025",
            items: [
                "Grundlegende Überarbeitung der Prompt-Logik für präzisere Kalenderblätter.",
                "Detailverbesserungen am User Interface und den Animationen."
            ]
        },
        {
            version: "v1.0",
            date: "24. Dezember 2025",
            items: [
                "Initialer Release und Start der öffentlichen Testphase."
            ]
        }
    ];

    return (
        <main className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12 flex flex-col items-center">

            <div className="w-full max-w-2xl relative">
                {/* Header with Back Button */}
                <div className="flex items-center justify-between mb-12">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium transition-colors text-gray-300 hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Zurück
                    </motion.button>
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-serif font-bold tracking-tight"
                    >
                        Changelog
                    </motion.h1>
                    <div className="w-[88px]" /> {/* Spacer for centering if needed, or empty */}
                </div>

                {/* Content */}
                <div className="space-y-12">
                    {changes.map((release, i) => (
                        <motion.div
                            key={release.version}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 + 0.2 }}
                            className="relative border-l border-white/10 pl-8 ml-4"
                        >
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-gray-700'}`} />

                            <div className="flex flex-col mb-4">
                                <div className="flex items-baseline gap-3">
                                    <h2 className={`text-3xl font-bold ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{release.version}</h2>
                                    <span className="text-sm font-mono text-gray-500">{release.date}</span>
                                </div>
                            </div>

                            <ul className="space-y-3">
                                {release.items.map((item, j) => (
                                    <li key={j} className="flex items-start gap-3 text-gray-300 leading-relaxed font-light">
                                        <CheckCircle2 size={16} className={`mt-1 shrink-0 ${i === 0 ? 'text-amber-500/50' : 'text-gray-700'}`} />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Message */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-gray-600 font-mono"
                >
                    dArk | digitaler Abreißkalender
                </motion.div>

            </div>
        </main>
    );
}
