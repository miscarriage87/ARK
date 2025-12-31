import { getDailyQuote } from "@/lib/ai-service";
import CalendarLeaf from "@/components/CalendarLeaf";
import UserHeader from "@/components/UserHeader";
import AnimatedPageContainer from "@/components/AnimatedPageContainer";
import BackgroundGlow from "@/components/BackgroundGlow";
import IntroSequence from "@/components/ui/IntroSequence";

// Define strict types for the User object as expected by sub-components
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

export default async function QuoteView({ user }: QuoteViewProps) {
    // This is the SLOW part (30-60s)
    // By putting it here, we allow the parent (page.tsx) to Suspend this component
    const quote = await getDailyQuote(user.id);
    const now = new Date().toISOString();

    return (
        <IntroSequence>
            <BackgroundGlow />

            <UserHeader user={user} />

            <AnimatedPageContainer>
                <CalendarLeaf quote={quote} dateStr={now} userId={user.id} />
            </AnimatedPageContainer>

            {/* Bottom Subtle Reflection */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
        </IntroSequence>
    );
}
