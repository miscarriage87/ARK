"use client";
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Share2, ThumbsDown, ThumbsUp, Zap } from "lucide-react";
import styles from "./CalendarLeaf.module.css";
import ConceptOverlay from "./ConceptOverlay";
import type { RatingVerdict } from "@/lib/taste-profile";

type Concept = {
    word: string;
    definition: string;
};

type CalendarQuote = {
    id: number;
    content: string;
    author: string | null;
    explanation: string | null;
    headline?: string | null;
    microAction?: string | null;
    concepts: string | null;
    isLiked?: boolean;
    userRating?: RatingVerdict | null;
};

type CalendarLeafProps = {
    quote: CalendarQuote;
    dateStr: string;
    userId?: string;
    /** Fired once when the user tears off the leaf. */
    onReveal?: () => void;
};

function parseConcepts(conceptsJson: string | null): Concept[] {
    if (!conceptsJson) return [];

    try {
        const parsed: unknown = JSON.parse(conceptsJson);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((item): item is Concept => {
            return typeof item === "object"
                && item !== null
                && "word" in item
                && "definition" in item
                && typeof item.word === "string"
                && typeof item.definition === "string";
        });
    } catch (error) {
        console.error("Interaction Error", error);
        return [];
    }
}

function vibrate(ms: number) {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}

export default function CalendarLeaf({ quote, dateStr, userId, onReveal }: CalendarLeafProps) {
    const [revealed, setRevealed] = useState(false);
    const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
    const [rating, setRating] = useState<RatingVerdict | null>(quote.userRating ?? (quote.isLiked ? "up" : null));
    const [isRating, setIsRating] = useState(false);
    const [hint, setHint] = useState<string | null>(null);

    const y = useMotionValue(0);
    const rotate = useTransform(y, [0, 300], [0, 15]);
    const opacity = useTransform(y, [0, 200], [1, 0]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            setRevealed(true);
            vibrate(20);
            onReveal?.();
        }
    };

    const displayDate = new Date(`${dateStr}T00:00:00`);
    const day = displayDate.getDate();
    const month = displayDate.toLocaleDateString("de-DE", { month: "long" });
    const weekday = displayDate.toLocaleDateString("de-DE", { weekday: "long" });

    const showHint = (text: string) => {
        setHint(text);
        setTimeout(() => setHint(null), 2600);
    };

    const handleRate = async (verdict: RatingVerdict) => {
        if (rating || isRating) return; // one verdict per leaf

        setIsRating(true);
        setRating(verdict); // optimistic
        vibrate(10);

        try {
            const res = await fetch("/api/quote/rate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {})
                },
                body: JSON.stringify({ quoteId: quote.id, verdict }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || `Fehler ${res.status}`);
            }

            if (data.alreadyRated && (data.verdict === "up" || data.verdict === "down")) {
                setRating(data.verdict);
                showHint("Du hast dieses Blatt schon bewertet.");
            } else {
                showHint(verdict === "up" ? "Danke! Mehr in diese Richtung." : "Danke! Davon künftig weniger.");
            }
        } catch (e) {
            console.error(e);
            setRating(null);
            showHint("Bewertung konnte nicht gespeichert werden.");
        } finally {
            setIsRating(false);
        }
    };

    const handleShare = async () => {
        const authorSuffix = quote.author && !["Einsicht", "Reflexion", "Impuls"].includes(quote.author) ? ` — ${quote.author}` : "";
        const shareText = `"${quote.content}"${authorSuffix}`;
        const shareData: ShareData = {
            title: 'ARK',
            text: shareText,
        };

        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
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
                    await navigator.clipboard.writeText(shareText);
                    showHint("Zitat kopiert.");
                } else {
                    throw new Error("Clipboard API not available");
                }
            } catch (err) {
                console.error('Clipboard error', err);
                showHint("Teilen fehlgeschlagen. Bitte kopiere den Text manuell.");
            }
        }
    };

    // Robust Interactive Text Rendering
    const renderInteractiveText = (text: string, conceptsJson: string | null): ReactNode => {
        if (!conceptsJson || !text) return text;

        const concepts = parseConcepts(conceptsJson);
        if (concepts.length === 0) return text;

        // Sort by length desc (longest match first)
        concepts.sort((a, b) => b.word.length - a.word.length);

        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const escapedWords = concepts.map((concept) => escapeRegExp(concept.word));
        if (escapedWords.length === 0) return text;

        const iterPattern = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi');

        if (!text.match(iterPattern)) return text;
        iterPattern.lastIndex = 0;

        const result: ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = iterPattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                result.push(text.substring(lastIndex, match.index));
            }

            const matchedWord = match[0];
            const concept = concepts.find((item) => item.word.toLowerCase() === matchedWord.toLowerCase());

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
    };

    const ratingLocked = rating !== null;

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
                  <div className={styles.quoteInner}>
                    {quote.headline ? (
                        <p className={styles.headline}>{quote.headline}</p>
                    ) : (
                        <span className={styles.headlineMark} aria-hidden="true">✦</span>
                    )}

                    <h2 className={styles.quoteText}>
                        &ldquo;{renderInteractiveText(quote.content, quote.concepts)}&rdquo;
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

                    {quote.microAction && (
                        <div className={styles.microAction}>
                            <Zap size={14} className={styles.microActionIcon} aria-hidden="true" />
                            <div>
                                <span className={styles.microActionLabel}>Heute</span>
                                <span className={styles.microActionText}>{quote.microAction}</span>
                            </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className={styles.actionsWrap}>
                    <div className={styles.hintSlot} aria-live="polite">
                        <AnimatePresence>
                            {hint && (
                                <motion.span
                                    key={hint}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={styles.hint}
                                >
                                    {hint}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            onClick={() => handleRate("up")}
                            disabled={ratingLocked || isRating}
                            aria-pressed={rating === "up"}
                            aria-label="Gefällt mir"
                            title="Gut: mehr davon"
                            className={`${styles.actionBtn} ${rating === "up" ? styles.actionBtnUp : ""} ${rating === "down" ? styles.actionBtnMuted : ""}`}
                        >
                            <ThumbsUp size={18} fill={rating === "up" ? "currentColor" : "none"} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleRate("down")}
                            disabled={ratingLocked || isRating}
                            aria-pressed={rating === "down"}
                            aria-label="Gefällt mir nicht"
                            title="Schlecht: weniger davon"
                            className={`${styles.actionBtn} ${rating === "down" ? styles.actionBtnDown : ""} ${rating === "up" ? styles.actionBtnMuted : ""}`}
                        >
                            <ThumbsDown size={18} fill={rating === "down" ? "currentColor" : "none"} />
                        </button>
                        <button type="button" onClick={handleShare} className={styles.actionBtn} aria-label="Teilen" title="Teilen">
                            <Share2 size={18} />
                        </button>
                    </div>
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
