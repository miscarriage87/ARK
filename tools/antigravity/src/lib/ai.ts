
export interface UserProfile {
    name: string;
    interests: string[];
    mood: string;
}

export interface Quote {
    id: string;
    content: string;
    author: string;
    topic: string;
    date: string;
}

const MOCK_QUOTES = [
    {
        content: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        topics: ["work", "passion", "success"]
    },
    {
        content: "In the middle of difficulty lies opportunity.",
        author: "Albert Einstein",
        topics: ["wisdom", "difficulty", "hope"]
    },
    {
        content: "Happiness depends upon ourselves.",
        author: "Aristotle",
        topics: ["happiness", "philosophy", "self"]
    }
];

export async function generateDailyQuote(profile: UserProfile | null): Promise<Quote> {
    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple selection logic "AI"
    const relevantQuote = MOCK_QUOTES[Math.floor(Math.random() * MOCK_QUOTES.length)];

    return {
        id: new Date().toISOString(),
        content: relevantQuote.content,
        author: relevantQuote.author,
        topic: relevantQuote.topics[0],
        date: new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    };
}
