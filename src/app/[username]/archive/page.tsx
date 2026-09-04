import { prisma } from "@/lib/prisma";
import { Quote } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Star, Calendar, ThumbsUp, ThumbsDown, EyeOff } from "lucide-react";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import { VIEW_TRACKING_SINCE } from "@/lib/constants";
import { verdictFromScore, type RatingVerdict } from "@/lib/taste-profile";
import { formatAppDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ArchiveEntry = Quote & {
    displayDate: string;
    verdict: RatingVerdict | null;
    unopened: boolean;
};

export default async function ArchivePage({ params, searchParams }: { params: Promise<{ username: string }>, searchParams: Promise<{ filter?: string }> }) {
    const { username } = await params;
    const { filter } = await searchParams;
    const decodedName = decodeURIComponent(username);

    const today = formatAppDate();

    const user = await prisma.user.findUnique({
        where: { name: decodedName },
        include: {
            views: {
                where: {
                    date: { lte: today }  // Only past/today, never pregenerated future leaves
                },
                include: { quote: true },
                orderBy: { date: 'desc' }
            },
            ratings: {
                include: { quote: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) {
        return (
            <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                Nutzer nicht gefunden.
            </main>
        );
    }

    const verdictByQuote = new Map<number, RatingVerdict>(
        user.ratings.map((rating) => [rating.quoteId, verdictFromScore(rating.score)])
    );

    let entries: ArchiveEntry[] = [];
    const showingFavorites = filter === 'favorites';

    if (showingFavorites) {
        // Favorites: everything rated "gut", ordered by rating date
        entries = user.ratings
            .filter((rating) => verdictFromScore(rating.score) === "up")
            .map((rating) => ({
                ...rating.quote,
                displayDate: formatAppDate(rating.createdAt),
                verdict: "up" as const,
                unopened: false
            }));
    } else {
        entries = user.views.map((view) => ({
            ...view.quote,
            displayDate: view.date,
            verdict: verdictByQuote.get(view.quoteId) ?? null,
            // Engagement tracking exists since VIEW_TRACKING_SINCE; older rows would all look unopened.
            unopened: view.date >= VIEW_TRACKING_SINCE && view.date < today && !view.firstOpenedAt && !view.revealedAt
        }));
    }

    const pillStyle = (active: boolean) => ({
        padding: '0.5rem 1.5rem',
        borderRadius: '99px',
        backgroundColor: active ? 'hsl(var(--primary))' : 'transparent',
        color: active ? 'black' : 'white',
        fontWeight: active ? 'bold' : 'normal',
        display: 'flex', alignItems: 'center', gap: '0.5rem'
    });

    return (
        <AnimatedPageContainer>
            <main style={{ minHeight: '100vh', padding: '2rem', maxWidth: '42rem', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <Link href={`/${username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                        <ArrowLeft size={20} /> Zurück
                    </Link>
                    <h1 style={{ fontSize: '1.5rem', fontFamily: 'serif' }}>Archiv</h1>
                    <div style={{ width: '24px' }}></div>
                </div>

                {/* Filter Toggle */}
                <div style={{ display: 'flex', gap: '1rem', padding: '0.25rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', width: 'fit-content', margin: '0 auto 2rem auto' }}>
                    <Link href={`/${username}/archive`} style={pillStyle(!showingFavorites)}>
                        <Calendar size={16} /> Verlauf
                    </Link>
                    <Link href={`/${username}/archive?filter=favorites`} style={pillStyle(showingFavorites)}>
                        <Star size={16} /> Favoriten
                    </Link>
                </div>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {entries.length === 0 && (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '4rem' }}>
                            {showingFavorites ? "Noch keine Favoriten. Bewerte ein Kalenderblatt mit Daumen hoch." : "Noch keine Einträge."}
                        </div>
                    )}
                    {entries.map((entry) => (
                        <article key={`${entry.id}-${entry.displayDate}`} style={{
                            padding: '1.5rem',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            borderRadius: '1rem',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {entry.headline && (
                                <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(var(--secondary))', marginBottom: '0.6rem', fontWeight: 600 }}>
                                    {entry.headline}
                                </div>
                            )}
                            <div style={{ fontSize: '1.1rem', marginBottom: '1rem', lineHeight: '1.5', fontFamily: 'var(--font-serif)' }}>
                                &ldquo;{entry.content}&rdquo;
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', opacity: 0.7, gap: '0.75rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {entry.verdict === "up" && <ThumbsUp size={14} style={{ color: '#fbbf24' }} aria-label="Gut bewertet" />}
                                    {entry.verdict === "down" && <ThumbsDown size={14} style={{ color: '#9ca3af' }} aria-label="Schlecht bewertet" />}
                                    {entry.unopened && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', opacity: 0.7 }}>
                                            <EyeOff size={12} /> Nicht geöffnet
                                        </span>
                                    )}
                                    {entry.author && !['Reflexion', 'Impuls', 'Einsicht'].includes(entry.author) ? entry.author : ''}
                                </span>
                                <span>{new Date(entry.displayDate + 'T00:00:00').toLocaleDateString('de-DE')}</span>
                            </div>
                            {entry.explanation && (
                                <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem', lineHeight: 1.5 }}>
                                    {entry.explanation}
                                </div>
                            )}
                            {entry.microAction && (
                                <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', opacity: 0.75 }}>
                                    <span style={{ color: '#fbbf24', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.65rem', marginRight: '0.5rem' }}>Heute</span>
                                    {entry.microAction}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </main>
        </AnimatedPageContainer>
    );
}
