/**
 * Normalizes a header string for comparison
 *
 * Transformations:
 * - Lowercase
 * - Trim whitespace
 * - Replace punctuation with space
 * - Remove currency symbols
 * - Collapse multiple spaces to single space
 *
 * Example: "Net Sales ($)" -> "net sales"
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    // Replace currency symbols
    .replace(/[$€£¥₹]/g, "")
    // Replace underscores with space
    .replace(/_/g, " ")
    // Replace punctuation with space (except apostrophes in words)
    .replace(/[^\w\s']/g, " ")
    // Remove standalone apostrophes
    .replace(/\s'\s/g, " ")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates similarity score between two normalized strings
 * Uses a combination of exact match, starts-with, contains, and word overlap
 *
 * @returns Score from 0 to 1
 */
export function calculateSimilarity(normalized: string, synonym: string): number {
  // Exact match
  if (normalized === synonym) {
    return 1.0;
  }

  // Check if one contains the other
  if (normalized.includes(synonym) || synonym.includes(normalized)) {
    const longerLength = Math.max(normalized.length, synonym.length);
    const shorterLength = Math.min(normalized.length, synonym.length);
    return 0.7 + (shorterLength / longerLength) * 0.2;
  }

  // Word overlap scoring
  const normalizedWords = new Set(normalized.split(" "));
  const synonymWords = new Set(synonym.split(" "));

  let matchCount = 0;
  for (const word of normalizedWords) {
    if (synonymWords.has(word)) {
      matchCount++;
    }
  }

  if (matchCount > 0) {
    const totalUniqueWords = new Set([...normalizedWords, ...synonymWords]).size;
    return (matchCount / totalUniqueWords) * 0.7;
  }

  // Partial word matching (for abbreviations like "qty" matching "quantity")
  for (const word of normalizedWords) {
    for (const synWord of synonymWords) {
      if (synWord.startsWith(word) || word.startsWith(synWord)) {
        const longerLength = Math.max(word.length, synWord.length);
        const shorterLength = Math.min(word.length, synWord.length);
        if (shorterLength >= 3) {
          return 0.3 + (shorterLength / longerLength) * 0.3;
        }
      }
    }
  }

  return 0;
}
