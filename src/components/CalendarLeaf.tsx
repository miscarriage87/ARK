"use client";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Quote, Share2, Heart } from "lucide-react";
import styles from "./CalendarLeaf.module.css";
import ConceptOverlay from "./ConceptOverlay";

type Concept = {
    word: string;
    definition: string;
};

type CalendarQuote = {
    id: number;
    content: string;
    author: string | null;
    explanation: string | null;
    concepts: string | null;
    isLiked?: boolean;
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

export default function CalendarLeaf({ quote, dateStr, userId }: { quote: CalendarQuote, dateStr: string, userId?: string }) {
    const [revealed, setRevealed] = useState(false);
    const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
    const [liked, setLiked] = useState(quote.isLiked || false);

    const y = useMotionValue(0);
    const rotate = useTransform(y, [0, 300], [0, 15]);
    const opacity = useTransform(y, [0, 200], [1, 0]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100) {
            setRevealed(true);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
        }
    };

    const displayDate = new Date(`${dateStr}T00:00:00`);
    const day = displayDate.getDate();
    const month = displayDate.toLocaleDateString("de-DE", { month: "long" });
    const weekday = displayDate.toLocaleDateString("de-DE", { weekday: "long" });

    const handleRate = async () => {
        if (liked) return; // Prevent double click
        setLiked(true); // Optimistic UI
        try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            await fetch("/api/quote/rate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(userId ? { "x-user-id": userId } : {})
                },
                body: JSON.stringify({ quoteId: quote.id, score: 5 }),
            });
            // alert("Danke! Das Zitat wurde gespeichert."); // Removed alert for smoother UX
        } catch (e) {
            console.error(e);
            setLiked(false); // Revert on error
        }
    };

    const handleShare = async () => {
        const shareText = `"${quote.content}" — ${quote.author}`;
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
    const renderInteractiveText = (text: string, conceptsJson: string | null): ReactNode => {
        if (!conceptsJson || !text) return text;

        const concepts = parseConcepts(conceptsJson);
        if (concepts.length === 0) return text;

        // Sort by length desc (longest match first)
        concepts.sort((a, b) => b.word.length - a.word.length);

        // Escape regex chars
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const escapedWords = concepts.map((concept) => escapeRegExp(concept.word));
        if (escapedWords.length === 0) return text;

        // Build regex with word boundaries to avoid partial matches inside words.
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
