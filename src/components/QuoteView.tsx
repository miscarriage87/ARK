"use client";

import CalendarLeaf from "@/components/CalendarLeaf";
import UserHeader from "@/components/UserHeader";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import BackgroundGlow from "@/components/BackgroundGlow";
import IntroSequence from "@/components/ui/IntroSequence";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useEffect, useState, useCallback } from "react";
import { fetchDailyQuoteAction } from "@/app/actions";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";

type QuoteViewProps = {
    user: {
        id: string;
        name: string;
        interests: string[];
        onboardingCompleted: boolean;
        createdAt: Date;
        preferences: string | null;
    };
};

type QuoteData = {
    id: number;
    content: string;
    author: string | null;
    explanation: string | null;
    category: string | null;
    concepts: string | null;
    isNew: boolean;
    isLiked: boolean;
};

// --- Pregeneration Schutz via SessionStorage (pro User) ---
const PREGENERATE_KEY_PREFIX = "pregenerate_triggered_";

function hasTriggeredToday(userId: string): boolean {
    if (typeof window === "undefined") return false;
    const key = PREGENERATE_KEY_PREFIX + userId;
    const stored = sessionStorage.getItem(key);
    if (!stored) return false;
    const today = new Date().toISOString().split("T")[0];
    return stored === today;
}

function markAsTriggered(userId: string): void {
    if (typeof window === "undefined") return;
    const key = PREGENERATE_KEY_PREFIX + userId;
    const today = new Date().toISOString().split("T")[0];
    sessionStorage.setItem(key, today);
}

/**
 * Triggert die Vorgenerierung für morgen im Hintergrund.
 * Fire-and-forget: Fehler werden ignoriert.
 * SessionStorage verhindert mehrfaches Triggern pro User am selben Tag.
 */
function triggerPregeneration(userId: string) {
    // Bereits heute für diesen User getriggert? Abbrechen.
    if (hasTriggeredToday(userId)) {
        console.log("[Pregenerate] Bereits heute für diesen User getriggert, überspringe.");
        return;
    }

    // Sofort markieren um Race Conditions zu verhindern
    markAsTriggered(userId);

    fetch('/api/quote/pregenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
    }).then(() => {
        console.log("[Pregenerate] Vorgenerierung für morgen gestartet.");
    }).catch(() => {
        // Bei Fehler: Markierung entfernen für Retry
        const key = PREGENERATE_KEY_PREFIX + userId;
        sessionStorage.removeItem(key);
    });
}

export default function QuoteView({ user }: QuoteViewProps) {
    const [data, setData] = useState<{ quote: QuoteData; date: string } | null>(null);
    const [error, setError] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    // Ob das Zitat bereits vorgeneriert/gecacht war (= keine lange Wartezeit)
    const [isPregenerated, setIsPregenerated] = useState<boolean | null>(null);

    const loadQuote = useCallback(async () => {
        setError(false);
        setIsRetrying(true);

        try {
            const res = await fetchDailyQuoteAction(user.id);

            if (res.success && res.quote) {
                const quoteData = res.quote as QuoteData;
                setData({ quote: quoteData, date: res.date! });
                setIsPregenerated(!quoteData.isNew);
                // Kein Trigger hier - erfolgt nur im useEffect (einmalig)
            } else {
                setError(true);
            }
        } catch (err) {
            console.error("[QuoteView] Fehler beim Laden:", err);
            setError(true);
        } finally {
            setIsRetrying(false);
        }
    }, [user.id]);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const res = await fetchDailyQuoteAction(user.id);
                if (!mounted) return;

                if (res.success && res.quote) {
                    const quoteData = res.quote as QuoteData;
                    setData({ quote: quoteData, date: res.date! });
                    // isNew=false bedeutet: War bereits gecacht/vorgeneriert
                    setIsPregenerated(!quoteData.isNew);

                    // Hintergrund-Vorgenerierung für morgen triggern
                    triggerPregeneration(user.id);
                } else {
                    setError(true);
                }
            } catch (err) {
                if (mounted) {
                    console.error("[QuoteView] Fehler beim Laden:", err);
                    setError(true);
                }
            }
        }

        load();

        return () => { mounted = false; };
    }, [user.id]);

    // Error State Component
    const ErrorState = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center p-8"
        >
            <AlertCircle size={48} className="text-red-400/80 mb-4" />
            <h3 className="text-xl font-medium text-white/90 mb-2">
                Zitat konnte nicht geladen werden
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm">
                Es gab ein Problem bei der Verbindung. Bitte versuche es erneut.
            </p>
            <button
                onClick={loadQuote}
                disabled={isRetrying}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30
                         text-amber-400 rounded-full transition-colors disabled:opacity-50"
            >
                <RefreshCw size={18} className={isRetrying ? "animate-spin" : ""} />
                {isRetrying ? "Wird geladen..." : "Erneut versuchen"}
            </button>
        </motion.div>
    );

    // Variante: "short" für gecachte Zitate (5s YinYang), "default" für Onboarding
    const introVariant = isPregenerated === null ? null : (isPregenerated ? "short" : "default");

    // Zeige LoadingScreen nur wenn:
    // 1. Noch kein Zitat geladen (!data)
    // 2. Kein Fehler (!error)
    // 3. Zitat wird gerade generiert (nicht vorgeneriert) - isPregenerated === false ODER noch unbekannt (null)
    const showLoadingScreen = !data && !error && isPregenerated !== true;

    return (
        <>
            {/* LoadingScreen AUSSERHALB von IntroSequence, damit er nicht durch visibility:hidden versteckt wird */}
            {showLoadingScreen && <LoadingScreen />}

            <IntroSequence variant={introVariant}>
                <BackgroundGlow />

                <UserHeader user={user} />

                <AnimatedPageContainer>
                    {data ? (
                        <CalendarLeaf quote={data.quote} dateStr={data.date} userId={user.id} />
                    ) : error ? (
                        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                            <ErrorState />
                        </div>
                    ) : null}
                </AnimatedPageContainer>

                {/* Bottom Subtle Reflection */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
            </IntroSequence>
        </>
    );
}
