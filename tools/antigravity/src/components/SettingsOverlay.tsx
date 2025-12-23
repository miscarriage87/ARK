"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Share } from "lucide-react";
import styles from "./SettingsOverlay.module.css";
import { useRouter } from "next/navigation";

const INTERESTS = ["Achtsamkeit", "Spiritualität", "Stoizismus", "Unternehmertum", "Wissenschaft", "Kunst", "Poesie", "Führung", "Wellness"];

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    user: {
        id: string;
        name: string;
        preferences?: string | null;
    };
}

export default function SettingsOverlay({ isOpen, onClose, user }: SettingsOverlayProps) {
    const router = useRouter();
    const [selections, setSelections] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        // Detect iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIos(isIOS);

        // Parse existing prefs
        if (user.preferences) {
            try {
                const prefs = JSON.parse(user.preferences);
                if (prefs.interests) setSelections(prefs.interests);
            } catch (e) { console.error(e); }
        }
    }, [user]);

    const toggleInterest = (interest: string) => {
        if (loading) return;
        setSelections(prev => {
            if (prev.includes(interest)) {
                return prev.filter(i => i !== interest);
            }
            if (prev.length >= 3) {
                return prev; // Silent limit like in Onboarding
            }
            return [...prev, interest];
        });
    };

    const save = async () => {
        setLoading(true);
        try {
            await fetch("/api/quote/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": user.id },
                body: JSON.stringify({ interests: selections, name: user.name }),
            });
            // Removed alert("Gespeichert!") as requested/suggested for smoother UX
            router.refresh();
            onClose();
        } catch (e) {
            alert("Fehler beim Speichern");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        <div className={styles.header}>
                            <h2 className={styles.title}>Einstellungen</h2>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Deine Interessen</h3>
                            <p className="text-[10px] text-gray-500 mb-4">Maximal 3 Kategorien auswählen.</p>
                            <div className={styles.chipContainer}>
                                {INTERESTS.map(item => (
                                    <div key={item} className="flex flex-col items-center">
                                        <button
                                            onClick={() => toggleInterest(item)}
                                            disabled={loading}
                                            className={`${styles.chip} ${selections.includes(item) ? styles.chipSelected : ""} ${(!selections.includes(item) && selections.length >= 3) || loading ? "opacity-50 cursor-not-allowed" : ""}`}
                                        >
                                            {item}
                                        </button>
                                        {item === "Stoizismus" && (
                                            <span className="text-[9px] text-gray-500 mt-1 italic whitespace-nowrap">Gelassenheit durch Vernunft</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Deine Sammlung</h3>
                            <button
                                onClick={() => {
                                    onClose();
                                    setTimeout(() => {
                                        router.push(`/${encodeURIComponent(user.name)}/archive`);
                                    }, 300);
                                }}
                                className={styles.chip}
                                style={{ width: '100%', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}
                            >
                                Zum Archiv / Verlauf
                            </button>
                        </div>

                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>App Installation</h3>
                            {ios ? (
                                <div className={styles.installGuide}>
                                    <div>1. Tippe auf den <strong>Teilen</strong> Button unten in Safari.</div>
                                    <div className={styles.iconRow}>
                                        <Share size={20} className="text-blue-500" />
                                        <span>Teilen</span>
                                    </div>
                                    <div className="mt-2">2. Wähle <strong>"Zum Home-Bildschirm"</strong>.</div>
                                </div>
                            ) : (
                                <div className={styles.installGuide}>
                                    Für die beste Erfahrung: Füge diese Seite zu deinen Lesezeichen hinzu oder nutze "Zum Startbildschirm hinzufügen" im Browsermenü.
                                </div>
                            )}
                        </div>

                        <button onClick={save} disabled={loading} className={styles.saveBtn}>
                            {loading ? "Speichert..." : "Speichern"}
                        </button>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
