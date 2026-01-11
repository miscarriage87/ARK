"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

type IntroVariant = "short" | "default" | null;

interface IntroSequenceProps {
    children: React.ReactNode;
    /**
     * Animation-Variante:
     * - "short": 5s YinYang Animation mit 2x 360° Rotation (für gecachte Zitate)
     * - "default": Standard ~2.8s Animation (für neue Zitate/Onboarding)
     * - null: Warte auf Variante (zeigt schwarzen Overlay)
     */
    variant?: IntroVariant;
}

export default function IntroSequence({ children, variant = "default" }: IntroSequenceProps) {
    const [reveal, setReveal] = useState(false);
    const [removeOverlay, setRemoveOverlay] = useState(false);

    // Animation-Parameter basierend auf Variante
    const isShortVariant = variant === "short";
    const revealDelay = isShortVariant ? 4500 : 2200;
    const removeDelay = isShortVariant ? 5500 : 3500;
    const rotationDegrees = isShortVariant ? 720 : 180;
    const rotationDuration = isShortVariant ? 4 : 1.8;

    // Sequence für "default" (Total ~2.8s):
    // 0s: Mount (Black Overlay)
    // 0.5s: Spin Starts
    // 2.0s: Contraction/Implosion
    // 2.2s: Reveal Triggered
    //
    // Sequence für "short" (Total ~5s):
    // 0s: Mount (Black Overlay)
    // 0-4s: 2x 360° Rotation (720°)
    // 4s: Contraction/Implosion
    // 4.5s: Reveal Triggered
    useEffect(() => {
        // Warte auf bekannte Variante bevor Animation startet
        if (variant === null) return;

        const timerReveal = setTimeout(() => {
            setReveal(true);
        }, revealDelay);

        const timerRemove = setTimeout(() => {
            setRemoveOverlay(true);
        }, removeDelay);

        return () => {
            clearTimeout(timerReveal);
            clearTimeout(timerRemove);
        };
    }, [variant, revealDelay, removeDelay]);

    return (
        <>
            {/* 1. The ACTUAL Page Content */}
            {/* Visibility hidden ensures NO painting of the yellow glow until we are ready to fade it in */}
            <div
                className={`w-full flex-1 flex flex-col items-center justify-center relative transition-all duration-[1500ms] ease-out ${reveal ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-95'}`}
                style={{ visibility: reveal ? 'visible' : 'hidden' }}
            >
                {children}
            </div>

            {/* 2. The Curtain (Overlay) */}
            <AnimatePresence>
                {!removeOverlay && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: reveal ? 0 : 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }} // Delay slightly to let content start appearing? No, overlay fades first.
                        className="fixed inset-0 z-50 bg-[#050505] flex items-center justify-center overflow-hidden pointer-events-none"
                    >
                        {/* Container for the Symbol */}
                        <motion.div
                            className="relative w-32 h-32"
                            initial={{ rotate: 0, scale: 1, opacity: 1 }}
                            animate={{
                                rotate: rotationDegrees,
                                scale: reveal ? 0 : 1,
                                opacity: reveal ? 0 : 1
                            }}
                            transition={{
                                rotate: { duration: rotationDuration, ease: "easeInOut" },
                                scale: { delay: rotationDuration, duration: 0.4, ease: "backIn" },
                                opacity: { delay: rotationDuration + 0.1, duration: 0.2 }
                            }}
                        >
                            {/* High Fidelity SVG Yin Yang */}
                            {/* White part (Yang) */}
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="2" className="opacity-20" />

                                {/* The main S curve shape */}
                                <path d="M50,2 
                                         A48,48 0 0,1 50,98
                                         A24,24 0 0,1 50,50
                                         A24,24 0 0,0 50,2Z"
                                    fill="white"
                                    className="opacity-90"
                                />
                                {/* The Dots */}
                                <circle cx="50" cy="26" r="6" fill="white" className="opacity-90" />
                                <circle cx="50" cy="74" r="6" fill="#050505" />
                            </svg>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
