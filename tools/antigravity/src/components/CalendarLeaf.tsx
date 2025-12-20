"use client";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
import { Quote, Share2, Heart } from "lucide-react";

export default function CalendarLeaf({ quote, dateStr }: { quote: any, dateStr: string }) {
    const [revealed, setRevealed] = useState(false);

    const y = useMotionValue(0);
    const rotate = useTransform(y, [0, 300], [0, 15]);
    const opacity = useTransform(y, [0, 200], [1, 0]);

    const handleDragEnd = (_: any, info: any) => {
        if (info.offset.y > 100) {
            setRevealed(true);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
        }
    };

    const day = new Date(dateStr).getDate();
    const month = new Date(dateStr).toLocaleDateString("de-DE", { month: "long" });
    const weekday = new Date(dateStr).toLocaleDateString("de-DE", { weekday: "long" });

    return (
        <div className="relative w-full max-w-sm aspect-[3/4] perspective-1000 mx-auto mt-8">

            {/* The Quote (Underneath) */}
            <div className="absolute inset-0 bg-[hsl(var(--card-bg))] border border-[hsl(var(--card-border))] rounded-2xl p-8 flex flex-col justify-center items-center text-center shadow-[var(--shadow-lg)] z-0">
                <Quote className="w-8 h-8 text-[hsl(var(--primary))] mb-4 opacity-50" />

                <h2 className="text-2xl md:text-3xl font-serif mb-6 leading-relaxed text-balance">
                    "{quote.content}"
                </h2>

                <p className="text-[hsl(var(--secondary))] uppercase tracking-widest text-xs font-semibold mb-6">
                    — {quote.author || "Unbekannt"}
                </p>

                {quote.explanation && (
                    <div className="text-xs opacity-60 font-sans leading-relaxed max-w-[250px]">
                        {quote.explanation}
                    </div>
                )}

                <div className="absolute bottom-6 flex gap-4">
                    <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition"><Heart size={18} /></button>
                    <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition"><Share2 size={18} /></button>
                </div>
            </div>

            {/* The Cover (Tear-off layer) */}
            {!revealed && (
                <motion.div
                    style={{ y, rotate, opacity }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.7}
                    onDragEnd={handleDragEnd}
                    whileHover={{ scale: 1.02 }}
                    className="absolute inset-0 bg-white text-black rounded-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl z-10 origin-top overflow-hidden"
                >
                    {/* Header */}
                    <div className="absolute top-0 w-full p-4 flex justify-between items-center opacity-40">
                        <span className="text-xs font-bold tracking-widest">{weekday.toUpperCase()}</span>
                        <div className="w-2 h-2 rounded-full bg-black"></div>
                    </div>

                    <h1 className="text-[8rem] font-bold font-sans tracking-tighter leading-none mb-0">
                        {day}
                    </h1>
                    <p className="text-3xl uppercase tracking-[0.3em] font-light">
                        {month}
                    </p>

                    <div className="absolute bottom-12 flex flex-col items-center gap-2">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400">Zum Enthüllen ziehen</p>
                        <div className="w-1 h-8 bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-gray-400 animate-pulse origin-top transform scale-y-50"></div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
