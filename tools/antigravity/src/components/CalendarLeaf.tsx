"use client";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
import { Quote, Share2, Heart } from "lucide-react";
import styles from "./CalendarLeaf.module.css";

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
        <div className={styles.container}>

            {/* The Quote (Underneath) */}
            <div className={styles.quoteCard}>
                <Quote className={styles.icon} />

                <h2 className={styles.quoteText}>
                    "{quote.content}"
                </h2>

                <p className={styles.quoteAuthor}>
                    — {quote.author || "Unbekannt"}
                </p>

                {quote.explanation && (
                    <div className={styles.explanation}>
                        {quote.explanation}
                    </div>
                )}

                <div className={styles.actions}>
                    <button className={styles.actionBtn}><Heart size={18} /></button>
                    <button className={styles.actionBtn}><Share2 size={18} /></button>
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
                    className={styles.leaf}
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                            {weekday.toUpperCase()}
                        </span>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'black' }}></div>
                    </div>

                    <h1 className={styles.dayNumber}>
                        {day}
                    </h1>
                    <p className={styles.monthName}>
                        {month}
                    </p>

                    <div className={styles.footer}>
                        <p className={styles.hint}>Zum Enthüllen ziehen</p>
                        <div className={styles.pill}>
                            <div className={styles.pillInner}></div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
