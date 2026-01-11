"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const TIMEOUT_SECONDS = 60;

export default function LoadingScreen() {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [dots, setDots] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [isTimedOut, setIsTimedOut] = useState(false);

    const STATUS_MESSAGES = [
        "Verbinde mit Neuralem Netz",
        "Analysiere Muster",
        "Formuliere Erkenntnis",
        "Verfeinere Nuancen",
        "Finalisiere Ausgabe"
    ];

    // 1. Anti-Flash Grace Period
    // Only show the screen if loading takes longer than 800ms.
    // If we unmount before that (cached/fast), the user never sees this screen.
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // 2. Simulated Progress (Tuned for ~60s generation)
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                // Slower asymptotic curve:
                // Start fast, then slow down significantly as we approach 90%
                // Divisor changed from 20 to 150 to stretch duration.
                // Min increment 0.05 ensures it keeps moving (alive) even at the end.
                const increment = Math.max(0.05, (98 - prev) / 150);
                return Math.min(99, prev + increment);
            });
        }, 100); // 10 ticks per second for smoothness
        return () => clearInterval(interval);
    }, []);

    // 3. Status Text Logic
    useEffect(() => {
        // Message cycling (Slower: 7s per message to span ~40s)
        const msgInterval = setInterval(() => {
            setStatusIndex(prev => {
                if (prev >= STATUS_MESSAGES.length - 1) {
                    return prev; // Stop at the last message
                }
                return prev + 1;
            });
        }, 7000);

        // Dots cycling
        const dotsInterval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? "" : prev + ".");
        }, 500);

        return () => {
            clearInterval(msgInterval);
            clearInterval(dotsInterval);
        };
    }, []);

    // 4. Elapsed Time Timer + Timeout Detection
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsed(prev => {
                const newElapsed = prev + 1;
                if (newElapsed >= TIMEOUT_SECONDS && !isTimedOut) {
                    setIsTimedOut(true);
                }
                return newElapsed;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isTimedOut]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className={`fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center text-white cursor-wait transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >

            {/* Background Glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[100px] rounded-full animate-pulse-slow" />
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-8">

                {/* Logo / Icon */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12 text-center"
                >
                    <h1 className="text-6xl font-serif font-black tracking-tighter mb-2 text-white/90">dArk</h1>
                </motion.div>

                {/* Status Text - Fixed Width Container for Dots to prevent jitter */}
                <div className="h-8 mb-8 flex items-center justify-center w-full">
                    {isTimedOut ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-amber-400/90"
                        >
                            <Clock size={14} />
                            <p className="text-xs font-mono uppercase tracking-widest">
                                Generierung dauert länger als erwartet
                            </p>
                        </motion.div>
                    ) : (
                        <div className="flex items-center">
                            <p className="text-xs font-mono text-amber-500/80 uppercase tracking-widest text-center whitespace-nowrap">
                                {STATUS_MESSAGES[statusIndex]}
                            </p>
                            <span className="text-xs font-mono text-amber-500/80 w-[24px] text-left">
                                {dots}
                            </span>
                        </div>
                    )}
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden relative">
                    {/* Progress Bar Fill */}
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 via-amber-400 to-white shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        style={{ width: `${progress}%` }}
                        transition={{ type: "tween", ease: "linear", duration: 0.2 }}
                    />
                </div>

                {/* Percentage */}
                <div className="w-full flex justify-between mt-2 text-[10px] text-gray-600 font-mono">
                    <span>{formatTime(elapsed)}</span>
                    <span>{Math.floor(progress)}%</span>
                </div>

            </div>
        </div>
    );
}
