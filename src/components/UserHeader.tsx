"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import SettingsOverlay from "./SettingsOverlay";
import { APP_VERSION } from "@/lib/constants";

interface UserHeaderProps {
    user: {
        id: string;
        name: string;
        preferences: string | null;
    };
}

export default function UserHeader({ user }: UserHeaderProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <div className="w-full z-50 flex justify-center pointer-events-none mb-4 md:mb-8 shrink-0">
                <div className="w-full max-w-[450px] flex justify-between items-end px-0 pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="flex items-center gap-4"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 flex items-center justify-center"
                        >
                            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                <path d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C36.1929 100 25 88.8071 25 75C25 61.1929 36.1929 50 50 50C63.8071 50 75 38.8071 75 25C75 11.1929 63.8071 0 50 0Z" fill="#000" />
                                <path d="M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C63.8071 0 75 11.1929 75 25C75 38.8071 63.8071 50 50 50C36.1929 50 25 61.1929 25 75C25 88.8071 36.1929 100 50 100Z" fill="#fff" />
                                <circle cx="50" cy="25" r="7" fill="#fff" />
                                <circle cx="50" cy="75" r="7" fill="#000" />
                            </svg>
                        </motion.div>

                        <div className="flex items-end gap-2">
                            <Link
                                href="/"
                                className="text-sm font-bold tracking-[0.35em] opacity-70 text-white select-none hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                dArk
                            </Link>

                            {/* Version Badge */}
                            <Link
                                href="/changelog"
                                className="text-[10px] font-mono text-amber-500/60 hover:text-amber-400 transition-colors border border-amber-500/20 rounded px-1.5 py-0.5 hover:bg-amber-500/10 hover:border-amber-500/40 mb-[1px]"
                            >
                                {APP_VERSION}
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-colors shadow-lg"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                        <div className="text-xs font-semibold tracking-wider text-gray-200 uppercase">{user.name}</div>
                    </motion.div>
                </div>
            </div>

            <SettingsOverlay
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                user={user}
            />
        </>
    );
}
