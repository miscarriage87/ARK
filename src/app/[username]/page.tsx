import { prisma } from "@/lib/prisma";
import Onboarding from "@/components/Onboarding";
import IntroSequence from "@/components/ui/IntroSequence";
import { Metadata } from "next";
import QuoteView from "@/components/QuoteView";
import { notFound } from "next/navigation";

type Props = {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    return {
        title: `dArk | ${decodeURIComponent(username)}`,
    }
}

export const dynamic = 'force-dynamic';

// ... imports

export default async function UserPage({ params }: Props) {
    const { username } = await params;
    const decodedName = decodeURIComponent(username);

    // Safety Net: Ignore requests that look like files (e.g. missing images)
    // This prevents the "UserPage Loading for: apple-touch-icon.png" issue
    if (decodedName.match(/\.(png|jpg|jpeg|gif|ico|svg|json|webmanifest)$/i)) {
        return notFound();
    }

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

    // 3. User exists -> Prepare Data for Suspended View
    // We need to parse 'interests' from the JSON preferences because QuoteView expects a strict array.
    let interests: string[] = [];
    if (user.preferences && typeof user.preferences === 'object' && !Array.isArray(user.preferences)) {
        const prefs = user.preferences as any;
        if (Array.isArray(prefs.interests)) {
            interests = prefs.interests as string[];
        }
    }

    const cleanUser = {
        ...user,
        interests,
        preferences: user.preferences
    };

    // We use the Client Component QuoteView to handle the fetching without blocking the initial render.
    // This bypasses Proxy Buffering (Apache/Nginx) issues.
    return (
        <main className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col items-center justify-center p-6 relative">
            <QuoteView user={cleanUser} />
        </main>
    );
}
