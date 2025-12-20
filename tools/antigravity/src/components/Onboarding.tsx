"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const INTERESTS = ["Stoicism", "Mindfulness", "Entrepreneurship", "Science", "Art", "Poetry", "Leadership", "Wellness"];

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
        <div className="w-full max-w-md bg-[hsl(var(--card-bg))] p-8 rounded-3xl border border-[hsl(var(--card-border))] shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-[hsl(var(--card-border))]">
                <motion.div
                    className="h-full bg-[hsl(var(--primary))]"
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
                        className="flex-1 flex flex-col justify-center"
                    >
                        <h2 className="text-2xl font-serif mb-2">What inspires you?</h2>
                        <p className="text-sm text-gray-400 mb-6">Select a few topics to personalize your daily drops.</p>

                        <div className="flex flex-wrap gap-2">
                            {INTERESTS.map(item => (
                                <button
                                    key={item}
                                    onClick={() => toggleInterest(item)}
                                    className={`px-4 py-2 rounded-full text-sm transition text-left border ${selections.includes(item)
                                            ? "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]"
                                            : "bg-white/5 border-white/10 hover:border-white/30"
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            disabled={selections.length === 0}
                            className="mt-8 self-end btn disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div
                        key="step2"
                        variants={variants}
                        initial="enter" animate="center" exit="exit"
                        className="flex-1 flex flex-col justify-center"
                    >
                        <h2 className="text-2xl font-serif mb-2">What should we call you?</h2>
                        <p className="text-sm text-gray-400 mb-6">Optional, but nice.</p>

                        <input
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-lg focus:outline-none focus:border-[hsl(var(--primary))]"
                        />

                        <button
                            onClick={submitProfile}
                            disabled={loading}
                            className="mt-8 w-full btn"
                        >
                            {loading ? "Creating Personal Profile..." : "Start Journey"}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
