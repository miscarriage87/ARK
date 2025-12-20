import { prisma } from "@/lib/prisma";
import { Quote } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft, Star, Calendar } from "lucide-react";

export default async function ArchivePage({ params, searchParams }: { params: Promise<{ username: string }>, searchParams: Promise<{ filter?: string }> }) {
    const { username } = await params;
    const { filter } = await searchParams;
    const decodedName = decodeURIComponent(username);

    const user = await prisma.user.findUnique({
        where: { name: decodedName },
        include: {
            views: {
                include: { quote: true },
                orderBy: { viewedAt: 'desc' }
            },
            ratings: {
                include: { quote: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!user) return <div>User not found</div>;

    let quotes: (Quote & { viewedAt?: Date })[] = [];
    const showingFavorites = filter === 'favorites';

    if (showingFavorites) {
        quotes = user.ratings.map(r => ({ ...r.quote, viewedAt: r.createdAt }));
    } else {
        // Default: History (Views). Unique by Quote ID? No, show timeline.
        quotes = user.views.map(v => ({ ...v.quote, viewedAt: v.viewedAt }));
    }

    return (
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
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '0.25rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', width: 'fit-content', margin: '0 auto 2rem auto' }}>
                <Link
                    href={`/${username}/archive`}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '99px',
                        backgroundColor: !showingFavorites ? 'hsl(var(--primary))' : 'transparent',
                        color: !showingFavorites ? 'black' : 'white',
                        fontWeight: !showingFavorites ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Calendar size={16} /> Verlauf
                </Link>
                <Link
                    href={`/${username}/archive?filter=favorites`}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '99px',
                        backgroundColor: showingFavorites ? 'hsl(var(--primary))' : 'transparent',
                        color: showingFavorites ? 'black' : 'white',
                        fontWeight: showingFavorites ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Star size={16} /> Favoriten
                </Link>
            </div>

            {/* Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {quotes.length === 0 && (
                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '4rem' }}>
                        Noch keine Einträge.
                    </div>
                )}
                {quotes.map((quote, i) => (
                    <div key={i} style={{
                        padding: '1.5rem',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ fontSize: '1.1rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                            "{quote.content}"
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.6 }}>
                            <span>{quote.author !== 'Reflexion' && quote.author !== 'Impuls' ? quote.author : ''}</span>
                            <span>{new Date(quote.viewedAt!).toLocaleDateString('de-DE')}</span>
                        </div>
                        {quote.explanation && (
                            <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                                {quote.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}
