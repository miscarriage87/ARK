"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./Onboarding.module.css";

const INTERESTS = ["Stoizismus", "Achtsamkeit", "Unternehmertum", "Wissenschaft", "Kunst", "Poesie", "Führung", "Wellness"];

export default function Onboarding() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [selections, setSelections] = useState<string[]>([]);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const toggleInterest = (interest: string) => {
        setSelections(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    };

    const submitProfile = async () => {
        setLoading(true);
        try {
            await fetch("/api/quote/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interests: selections, name }),
            });
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const variants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    };

    return (
        <div className={styles.card}>
            <div className={styles.progressBarContainer}>
                <motion.div
                    className={styles.progressBarFill}
                    initial={{ width: "0%" }}
                    animate={{ width: step === 0 ? "50%" : "100%" }}
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
                        <p className={styles.subtext}>Wähle ein paar Themen für deine tägliche Inspiration.</p>

                        <div className={styles.chipContainer}>
                            {INTERESTS.map(item => (
                                <button
                                    key={item}
                                    onClick={() => toggleInterest(item)}
                                    className={`${styles.chip} ${selections.includes(item) ? styles.chipSelected : ""}`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            disabled={selections.length === 0}
                            className={`${styles.button} ${styles.buttonNext}`}
                        >
                            Weiter
                        </button>
                    </motion.div>
                )}

                {step === 1 && (
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
