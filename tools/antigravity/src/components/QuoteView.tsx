"use client";

import CalendarLeaf from "@/components/CalendarLeaf";
import UserHeader from "@/components/UserHeader";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import BackgroundGlow from "@/components/BackgroundGlow";
import IntroSequence from "@/components/ui/IntroSequence";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useEffect, useState } from "react";
import { fetchDailyQuoteAction } from "@/app/actions";

type QuoteViewProps = {
    user: {
        id: string;
        name: string;
        interests: string[];
        onboardingCompleted: boolean;
        createdAt: Date;
        preferences: any;
    };
};

export default function QuoteView({ user }: QuoteViewProps) {
    const [data, setData] = useState<{ quote: any; date: string } | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function load() {
            const res = await fetchDailyQuoteAction(user.id);
            if (!mounted) return;

            if (res.success && res.quote) {
                setData({ quote: res.quote, date: res.date });
            } else {
                setError(true);
            }
        }

        load();

        return () => { mounted = false; };
    }, [user.id]);

    // If we have data, we show the full leaf.
    // If not, we show the IntroSequence + Header + BACKGROUND + Loading Screen.
    // Why IntroSequence? Because we want the "Logo" to be there waiting.
    // Actually, LoadingScreen HAS the logo.

    // Strategy:
    // 1. Initial Render: IntroSequence (Reveal=false) -> Background -> Header -> LoadingScreen (Visible).
    // 2. Data Loaded: LoadingScreen fades out? 

    // Wait, IntroSequence handles the "Reveal".
    // If we use IntroSequence, it starts hidden.

    return (
        <IntroSequence>
            <BackgroundGlow />

            <UserHeader user={user} />

            <AnimatedPageContainer>
                {data ? (
                    <CalendarLeaf quote={data.quote} dateStr={data.date} userId={user.id} />
                ) : (
                    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                        {/* 
                           We PLACE the LoadingScreen here. 
                           Since this component is inside Page -> Main, it covers the screen.
                           The 'fixed inset-0' in LoadingScreen handles the positioning.
                        */}
                        <LoadingScreen />
                    </div>
                )}
            </AnimatedPageContainer>

            {/* Bottom Subtle Reflection */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
        </IntroSequence>
    );
}
