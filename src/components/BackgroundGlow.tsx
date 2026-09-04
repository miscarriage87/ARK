"use client";
import React from "react";
import { motion } from "framer-motion";

// Tiny procedural grain texture so the page does not depend on a third-party host.
const NOISE_DATA_URI = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

interface BackgroundGlowProps {
    opacity?: number;
}

export default function BackgroundGlow({ opacity = 1 }: BackgroundGlowProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity }}
            transition={{ duration: 2 }}
            className="absolute inset-0 overflow-hidden pointer-events-none"
        >
            {/* Primary Amber Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.15, 0.25, 0.15]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-amber-500/10 rounded-full blur-[160px]"
            />
            {/* Subtle Purple Accent */}
            <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[140px]" />
            {/* Grain/Noise Overlay (inline SVG, no external request) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: NOISE_DATA_URI }} />
        </motion.div>
    );
}
