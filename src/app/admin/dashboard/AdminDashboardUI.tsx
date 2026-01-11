"use client";

import { useState } from "react";
import { User, Database, Brain, Globe, BookOpen, Quote, ChevronDown, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type DashboardProps = {
    users: any[];
    systemContext: {
        masterPrompt: string;
        styleGuides: Record<string, string>;
        archetypes: Record<string, string[]>;
        instructions: Record<string, string>;
    };
    systemVersion: string;
};

export default function AdminDashboardUI({ users, systemContext, systemVersion }: DashboardProps) {
    // Sections: 'users', 'context', or null (all closed)
    const [openSections, setOpenSections] = useState<string[]>([]);

    const toggleSection = (id: string) => {
        setOpenSections(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <main className="min-h-screen p-8 max-w-5xl mx-auto text-white">
            <header className="flex justify-between items-center mb-12 border-b border-white/10 pb-6">
                <h1 className="text-3xl font-serif font-bold tracking-wide">Admin Dashboard</h1>
                <div className="flex gap-4 text-xs font-mono text-gray-500">
                    <span>Users: {users.length}</span>
                    <span>System: {systemVersion}</span>
                </div>
            </header>

            <div className="flex flex-col gap-6">

                {/* SECTION 1: REGISTRIERTE NUTZER */}
                <CollapsibleSection
                    id="users"
                    title="Registrierte Nutzer"
                    icon={<User size={20} className="text-purple-300" />}
                    isOpen={openSections.includes("users")}
                    onToggle={() => toggleSection("users")}
                >
                    <div className="flex flex-col gap-2">
                        {users.map((user) => {
                            const lastView = user.views[0];
                            const lastDateObj = lastView ? new Date(lastView.date) : null;
                            const lastDate = lastDateObj ? lastDateObj.toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-";

                            // Check if today
                            const now = new Date();
                            const todayStr = now.toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const isToday = lastDate === todayStr;

                            return (
                                <Link key={user.id} href={`/admin/user/${user.id}`}>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-purple-500/30 transition-all flex items-center justify-between group">

                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/5 shrink-0">
                                                <User size={18} className="text-gray-400 group-hover:text-white" />
                                            </div>

                                            {/* Info */}
                                            <div className="overflow-hidden">
                                                <div className="font-bold text-base text-gray-200 group-hover:text-white flex items-center gap-2">
                                                    {user.name}
                                                    <span className="text-[11px] font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 group-hover:border-white/10 transition-colors">
                                                        {user.id}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Last Active Date */}
                                        <div className={`flex items-center gap-2 text-xs font-mono ${!isToday ? 'text-amber-500 font-bold' : 'text-gray-500'}`}>
                                            <Clock size={12} className={!isToday ? 'opacity-100' : 'opacity-50'} />
                                            <span>{lastView ? lastDate : "Neu"}</span>
                                        </div>

                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </CollapsibleSection>

                {/* SECTION 2: MASTER SYSTEM CONTEXT */}
                <CollapsibleSection
                    id="context"
                    title="Master System Context (Read-Only)"
                    icon={<Brain size={20} className="text-blue-300" />}
                    isOpen={openSections.includes("context")}
                    onToggle={() => toggleSection("context")}
                >
                    <div className="grid grid-cols-1 gap-6">

                        {/* MASTER PROMPT */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="bg-white/5 p-4 border-b border-white/10 font-bold text-sm flex items-center gap-2 text-gray-300">
                                <Quote size={16} /> DEFAULT_MASTER_PROMPT
                            </div>
                            <pre className="p-4 text-[11px] font-mono text-gray-400 whitespace-pre-wrap leading-relaxed">
                                {systemContext.masterPrompt}
                            </pre>
                        </div>

                        {/* STYLE GUIDES */}
                        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                            <div className="bg-white/5 p-4 border-b border-white/10 font-bold text-sm flex items-center gap-2 text-gray-300">
                                <BookOpen size={16} /> CATEGORY_STYLE_GUIDE ({Object.keys(systemContext.styleGuides).length} Categories)
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(systemContext.styleGuides).map(([cat, guide]) => (
                                    <div key={cat} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="text-xs font-bold text-purple-400 mb-2 uppercase">{cat}</div>
                                        <pre className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap">{guide.trim()}</pre>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ARCHETYPES & MODES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="bg-white/5 p-4 border-b border-white/10 font-bold text-sm flex items-center gap-2 text-gray-300">
                                    <Globe size={16} /> ARCHETYPES_FOR_MODE
                                </div>
                                <div className="p-4 flex flex-col gap-4">
                                    {Object.entries(systemContext.archetypes).map(([mode, list]) => (
                                        <div key={mode}>
                                            <span className="text-xs font-bold text-blue-400 block mb-1">{mode}</span>
                                            <div className="flex flex-wrap gap-1">
                                                {list.map(a => (
                                                    <span key={a} className="text-[11px] px-2 py-0.5 bg-white/5 rounded border border-white/5 text-gray-400">{a}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="bg-white/5 p-4 border-b border-white/10 font-bold text-sm flex items-center gap-2 text-gray-300">
                                    <Database size={16} /> MODE_INSTRUCTIONS
                                </div>
                                <div className="p-4 flex flex-col gap-4">
                                    {Object.entries(systemContext.instructions).map(([mode, instr]) => (
                                        <div key={mode}>
                                            <span className="text-xs font-bold text-pink-400 block mb-1">{mode}</span>
                                            <pre className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap bg-black/20 p-2 rounded">{instr.trim()}</pre>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </CollapsibleSection>
            </div>
        </main>
    );
}

function CollapsibleSection({ id, title, icon, isOpen, onToggle, children }: { id: string, title: string, icon: React.ReactNode, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) {
    return (
        <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <h2 className="text-lg font-bold text-gray-200">{title}</h2>
                </div>
                {isOpen ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="p-6 pt-0 border-t border-white/5 relative z-10">
                            {/* Added padding top to separate from header slightly */}
                            <div className="mt-6">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
