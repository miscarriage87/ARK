"use client";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
import { Quote, Share2, Heart } from "lucide-react";
import styles from "./CalendarLeaf.module.css";

export default function CalendarLeaf({ quote, dateStr, userId }: { quote: any, dateStr: string, userId?: string }) {
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

    const handleRate = async () => {
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            await fetch("/api/quote/rate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quoteId: quote.id, score: 5 }),
            });
            alert("Danke! Das Zitat wurde gespeichert.");
        } catch (e) {
            console.error(e);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            navigator.share({
                title: 'ARK',
                text: `"${quote.content}" — ${quote.author}`,
                url: window.location.href,
            }).catch(err => console.log('Error sharing', err));
        } else {
            navigator.clipboard.writeText(`"${quote.content}" — ${quote.author}`);
            alert("Zitat kopiert!");
        }
    };

    return (
        <div className={styles.container}>

            {/* The Quote (Underneath) */}
            <div className={styles.quoteCard}>
                <div className={styles.quoteContent}>
                    <Quote className={styles.icon} />

                    <h2 className={styles.quoteText}>
                        "{quote.content}"
                    </h2>

                    {quote.author && quote.author !== "Unbekannt" && quote.author !== "Unknown" && (
                        <p className={styles.quoteAuthor}>
                            — {quote.author}
                        </p>
                    )}

                    {quote.explanation && (
                        <div className={styles.explanation}>
                            {quote.explanation}
                        </div>
                    )}

                    {quote.concepts && (
                        <div style={{ marginTop: '1.5rem', textAlign: 'left', width: '100%', fontSize: '0.75rem' }}>
                            {(() => {
                                try {
                                    const concepts = JSON.parse(quote.concepts);
                                    return concepts.map((c: any, i: number) => (
                                        <div key={i} style={{ marginBottom: '0.5rem' }}>
                                            <strong style={{ color: 'hsl(var(--primary))' }}>{c.word}:</strong> <span style={{ opacity: 0.8 }}>{c.definition}</span>
                                        </div>
                                    ));
                                } catch (e) { return null; }
                            })()}
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button onClick={handleRate} className={styles.actionBtn}><Heart size={18} /></button>
                    <button onClick={handleShare} className={styles.actionBtn}><Share2 size={18} /></button>
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
