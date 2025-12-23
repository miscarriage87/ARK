"use client";
import React from "react";
import { motion } from "framer-motion";

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
            {/* Grain/Noise Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </motion.div>
    );
}
