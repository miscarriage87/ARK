import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";
import CalendarLeaf from "@/components/CalendarLeaf";
import Onboarding from "@/components/Onboarding";
import UserHeader from "@/components/UserHeader";
import styles from "../page.module.css";
import { Metadata } from "next";

type Props = {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    return {
        title: `ARK | ${decodeURIComponent(username)}`,
    }
}

export const dynamic = 'force-dynamic';

export default async function UserPage({ params }: Props) {
    const { username } = await params;
    const decodedName = decodeURIComponent(username);
    console.log(`[UserPage] Loading for: ${decodedName}`);

    // 1. Try to find user by Name
    // Note: Schema has `name` as unique.
    const user = await prisma.user.findUnique({
        where: { name: decodedName },
    });

    // 2. If no user, or onboarding not done -> Show Onboarding
    // Pass the name to Onboarding so it can auto-create the user
    if (!user || !user.onboardingCompleted) {
        return (
            <main className={styles.main}>
                <div className={styles.intro}>
                    <h1 className={styles.heroTitle}>ARK</h1>
                    <p className={styles.heroSubtitle}>
                        Willkommen, {decodedName}.<br />
                        Tägliche Weisheit, passend zu deiner Schwerkraft.
                    </p>
                </div>
                <Onboarding initialName={decodedName} />
            </main>
        );
    }

    // 3. User exists -> Get Quote
    const quote = await getDailyQuote(user.id);
    const now = new Date().toISOString();

    return (
        <main className={`${styles.main} ${styles.mainStart}`}>
            <UserHeader user={user} />

            <CalendarLeaf quote={quote} dateStr={now} userId={user.id} />
        </main>
    );
}
