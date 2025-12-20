import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";
import CalendarLeaf from "@/components/CalendarLeaf";
import Onboarding from "@/components/Onboarding";
import styles from "./page.module.css";

export default async function Home() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Fetch user profile
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Deciding View:
  // If no user record, or onboarding incomplete -> Show Onboarding
  if (!user || !user.onboardingCompleted) {
    return (
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.heroTitle}>ARK</h1>
          <p className={styles.heroSubtitle}>
            Tägliche Weisheit, passend zu deiner Schwerkraft.
          </p>
        </div>
        <Onboarding />
      </main>
    );
  }

  // User is onboarded, get quote
  const quote = await getDailyQuote(userId);
  const now = new Date().toISOString();

  return (
    <main className={`${styles.main} ${styles.mainStart}`}>
      <div className={styles.headerBar}>
        <div className={styles.logoSmall}>ARK</div>
        <div className={styles.profileContainer}>
          <div className={styles.statusDot}></div>
          <div className={styles.profileName}>{user.name || "Entdecker"}</div>
        </div>
      </div>

      <CalendarLeaf quote={quote} dateStr={now} />
    </main>
  );
}
