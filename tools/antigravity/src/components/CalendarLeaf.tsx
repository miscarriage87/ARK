"use client";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";
import { Quote, Share2, Heart } from "lucide-react";
import styles from "./CalendarLeaf.module.css";
import ConceptOverlay from "./ConceptOverlay";

export default function CalendarLeaf({ quote, dateStr, userId }: { quote: any, dateStr: string, userId?: string }) {
    const [revealed, setRevealed] = useState(false);
    const [activeConcept, setActiveConcept] = useState<{ word: string, definition: string } | null>(null);
    const [liked, setLiked] = useState(quote.isLiked || false);

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
        if (liked) return; // Prevent double click
        setLiked(true); // Optimistic UI
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            await fetch("/api/quote/rate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quoteId: quote.id, score: 5 }),
            });
            // alert("Danke! Das Zitat wurde gespeichert."); // Removed alert for smoother UX
        } catch (e) {
            console.error(e);
            setLiked(false); // Revert on error
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: 'ARK',
            text: `"${quote.content}" — ${quote.author}`,
        };

        if (navigator.share && navigator.canShare?.(shareData as any)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    console.error('Error sharing', err);
                }
            }
        } else {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(shareData.text);
                    alert("Zitat kopiert!");
                } else {
                    throw new Error("Clipboard API not available");
                }
            } catch (err) {
                console.error('Clipboard error', err);
                alert("Teilen fehlgeschlagen. Bitte kopiere den Text manuell.");
            }
        }
    };

    // Robust Interactive Text Rendering
    const renderInteractiveText = (text: string, conceptsJson: string | null) => {
        if (!conceptsJson || !text) return text;

        try {
            const concepts = JSON.parse(conceptsJson);
            if (!Array.isArray(concepts) || concepts.length === 0) return text;

            // Sort by length desc (longest match first)
            concepts.sort((a: any, b: any) => b.word.length - a.word.length);

            // Escape regex chars
            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Build regex with word boundaries to avoid partial matches inside words
            // Flag 'i' for case insensitive
            const pattern = new RegExp(`\\b(${concepts.map((c: any) => escapeRegExp(c.word)).join('|')})\\b`, 'gi');

            const matches = text.match(pattern);
            if (!matches) return text;

            const result = [];
            let lastIndex = 0;
            let match;
            const iterPattern = new RegExp(`\\b(${concepts.map((c: any) => escapeRegExp(c.word)).join('|')})\\b`, 'gi');

            while ((match = iterPattern.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    result.push(text.substring(lastIndex, match.index));
                }

                const matchedWord = match[0];
                const concept = concepts.find((c: any) => c.word.toLowerCase() === matchedWord.toLowerCase());

                if (concept) {
                    result.push(
                        <span
                            key={match.index}
                            onClick={(e) => { e.stopPropagation(); setActiveConcept(concept); }}
                            style={{
                                textDecoration: 'underline',
                                textDecorationStyle: 'dashed',
                                textDecorationColor: 'hsl(var(--primary))',
                                cursor: 'pointer',
                                textUnderlineOffset: '4px'
                            }}
                        >
                            {matchedWord}
                        </span>
                    );
                } else {
                    result.push(matchedWord);
                }

                lastIndex = iterPattern.lastIndex;
            }

            if (lastIndex < text.length) {
                result.push(text.substring(lastIndex));
            }

            return result;

        } catch (e) {
            console.error("Interaction Error", e);
            return text;
        }
    };

    return (
        <div className={styles.container}>
            <ConceptOverlay
                word={activeConcept?.word || null}
                definition={activeConcept?.definition || null}
                onClose={() => setActiveConcept(null)}
            />

            {/* The Quote (Underneath) */}
            <div className={styles.quoteCard}>
                <div className={styles.quoteContent}>
                    <Quote className={styles.icon} />

                    <h2 className={styles.quoteText}>
                        "{renderInteractiveText(quote.content, quote.concepts)}"
                    </h2>

                    {quote.author && quote.author !== "Unbekannt" && quote.author !== "Unknown" && (
                        <p className={styles.quoteAuthor}>
                            — {quote.author}
                        </p>
                    )}

                    {quote.explanation && (
                        <div className={styles.explanation}>
                            {renderInteractiveText(quote.explanation, quote.concepts)}
                        </div>
                    )}


                </div>

                <div className={styles.actions}>
                    <button onClick={handleRate} className={styles.actionBtn}>
                        <Heart size={18} fill={liked ? "currentColor" : "none"} className={liked ? "text-red-500" : ""} />
                    </button>
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
