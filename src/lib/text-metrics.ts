/**
 * Small, dependency-free text metrics shared by the novelty scorer and the taste profile.
 */

export function normalizeWords(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[^\p{L}\p{N}\s-]/gu, " ")
            .split(/\s+/)
            .filter((word) => word.length > 3)
    );
}

export function jaccardSimilarity(a: string, b: string): number {
    const aWords = normalizeWords(a);
    const bWords = normalizeWords(b);

    if (aWords.size === 0 || bWords.size === 0) return 0;

    let intersection = 0;
    for (const word of aWords) {
        if (bWords.has(word)) intersection++;
    }

    const union = new Set([...aWords, ...bWords]).size;
    return union === 0 ? 0 : intersection / union;
}

export function countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
}

export function countSentences(text: string): number {
    return text.split(/[.!?…]+/).map((part) => part.trim()).filter((part) => part.length > 0).length;
}
