"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./Onboarding.module.css";

const INTERESTS = ["Achtsamkeit", "Spiritualität", "Stoizismus", "Unternehmertum", "Wissenschaft", "Kunst", "Poesie", "Führung", "Wellness"];

interface OnboardingProps {
    initialName?: string;
}

export default function Onboarding({ initialName }: OnboardingProps) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [selections, setSelections] = useState<string[]>([]);
    // Use initialName if provided
    const [name, setName] = useState(initialName || "");
    const [loading, setLoading] = useState(false);
    const [fakeProgress, setFakeProgress] = useState(0);

    const toggleInterest = (interest: string) => {
        if (loading) return; // Read-only
        setSelections(prev => {
            if (prev.includes(interest)) {
                return prev.filter(i => i !== interest);
            }
            if (prev.length >= 3) {
                return prev; // Limit to 3
            }
            return [...prev, interest];
        });
    };

    const submitProfile = async () => {
        setLoading(true);
        setFakeProgress(0);

        // Simulate a smooth progress bar
        const interval = setInterval(() => {
            setFakeProgress(prev => {
                if (prev >= 95) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + Math.random() * 5;
            });
        }, 150);

        try {
            await fetch("/api/quote/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interests: selections, name }),
            });
            setFakeProgress(100);
            setTimeout(() => {
                router.refresh();
            }, 500);
        } catch (e) {
            console.error(e);
            clearInterval(interval);
            setLoading(false);
        }
    };

    const variants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    };

    // If name is pre-filled, we might want to skip step 1 or change the flow.
    // Requirement: "system would already know who is the current user" -> So name is known.
    // We just need interests.

    return (
        <div className={styles.card}>
            {/* Progress Bar */}
            <div className={styles.progressBarContainer}>
                <motion.div
                    className={styles.progressBarFill}
                    initial={{ width: "0%" }}
                    animate={{ width: loading ? `${fakeProgress}%` : (step === 0 ? "50%" : "100%") }}
                    style={{
                        backgroundColor: loading ? 'hsl(var(--primary))' : undefined,
                        boxShadow: loading ? '0 0 20px hsl(var(--primary)/0.5)' : undefined
                    }}
                />
            </div>

            <AnimatePresence mode="wait">
                {step === 0 && (
                    <motion.div
                        key="step1"
                        variants={variants}
                        initial="enter" animate="center" exit="exit"
                        className={styles.stepContainer}
                    >
                        <h2 className={styles.heading}>Was inspiriert dich?</h2>
                        <p className={styles.subtext}>Wähle maximal drei Kategorien für deine tägliche Inspiration.</p>

                        <div className={styles.chipContainer} style={{ zIndex: 10, position: 'relative' }}>
                            {INTERESTS.map(item => (
                                <div key={item} className="flex flex-col items-center">
                                    <button
                                        onClick={() => toggleInterest(item)}
                                        disabled={loading}
                                        type="button"
                                        className={`${styles.chip} ${selections.includes(item) ? styles.chipSelected : ""} ${(!selections.includes(item) && selections.length >= 3) || loading ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        {item}
                                    </button>
                                    {item === "Stoizismus" && (
                                        <span className="text-[10px] text-gray-500 mt-1 italic whitespace-nowrap">Gelassenheit durch Vernunft</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col items-center gap-4">
                            <button
                                onClick={() => {
                                    if (initialName) {
                                        submitProfile(); // Skip name step if known
                                    } else {
                                        setStep(1);
                                    }
                                }}
                                disabled={selections.length === 0 || loading}
                                className={`${styles.button} ${styles.buttonNext} ${loading ? 'opacity-70' : ''}`}
                                style={{ zIndex: 20, position: 'relative' }}
                            >
                                {loading ? "Einen Moment..." : (initialName ? "Los geht's..." : "Weiter")}
                            </button>

                            {!loading && (
                                <p className="text-[11px] text-gray-400 opacity-60">
                                    Deine Auswahl kannst du später jederzeit im Menü anpassen.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === 1 && !initialName && (
                    <motion.div
                        key="step2"
                        variants={variants}
                        initial="enter" animate="center" exit="exit"
                        className={styles.stepContainer}
                    >
                        <h2 className={styles.heading}>Wie sollen wir dich nennen?</h2>
                        <p className={styles.subtext}>Optional, aber nett.</p>

                        <input
                            type="text"
                            placeholder="Dein Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={styles.input}
                        />

                        <button
                            onClick={submitProfile}
                            disabled={loading}
                            className={styles.button}
                        >
                            {loading ? "Profil wird erstellt..." : "Reise starten"}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
