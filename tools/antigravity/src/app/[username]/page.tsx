import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";
import CalendarLeaf from "@/components/CalendarLeaf";
import Onboarding from "@/components/Onboarding";
import UserHeader from "@/components/UserHeader";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import BackgroundGlow from "@/components/BackgroundGlow";
import { Metadata } from "next";

type Props = {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    return {
        title: `DARK | ${decodeURIComponent(username)}`,
    }
}

export const dynamic = 'force-dynamic';

export default async function UserPage({ params }: Props) {
    const { username } = await params;
    const decodedName = decodeURIComponent(username);
    console.log(`[UserPage] Loading for: ${decodedName}`);

    // 1. Try to find user by Name
    const user = await prisma.user.findUnique({
        where: { name: decodedName },
    });

    // 2. If no user, or onboarding not done -> Show Onboarding
    if (!user || !user.onboardingCompleted) {
        return (
            <main className="min-h-screen bg-[hsl(240,10%,4%)] text-white font-sans selection:bg-amber-500/30 flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full">
                    <h1 className="text-8xl font-serif font-black tracking-tighter mb-4 text-white/90">DARK</h1>
                    <p className="text-xl font-light text-gray-400 mb-12">
                        Willkommen, <span className="text-white font-medium">{decodedName}</span>.<br />
                        Tägliche Inspiration, passend zu deinen Interessen.
                    </p>
                    <Onboarding initialName={decodedName} />
                </div>
            </main>
        );
    }

    // 3. User exists -> Get Quote
    const quote = await getDailyQuote(user.id);
    const now = new Date().toISOString();

    return (
        <main className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center justify-center p-6 relative">
            <BackgroundGlow />

            <UserHeader user={user} />

            <AnimatedPageContainer>
                <CalendarLeaf quote={quote} dateStr={now} userId={user.id} />
            </AnimatedPageContainer>

            {/* Bottom Subtle Reflection */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
        </main>
    );
}
