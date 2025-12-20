import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";
import CalendarLeaf from "@/components/CalendarLeaf";
import Onboarding from "@/components/Onboarding";

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
      <main className="container">
        <div className="text-center mb-12 animate-fade-in px-4">
          <h1 className="title text-5xl md:text-7xl mb-4">ARK</h1>
          <p className="text-xl md:text-2xl text-[hsl(var(--foreground))] opacity-80 font-light tracking-wide">
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
    <main className="container justify-start pt-8 pb-12">
      <div className="w-full max-w-md flex justify-between items-center px-4 mb-4">
        <div className="text-2xl font-serif font-bold tracking-tighter">ARK</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <div className="text-sm font-mono opacity-50 uppercase">{user.name || "Entdecker"}</div>
        </div>
      </div>

      <CalendarLeaf quote={quote} dateStr={now} />
    </main>
  );
}
