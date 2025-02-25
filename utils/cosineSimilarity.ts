// utils/cosineSimilarity.ts
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) throw new Error("Vectors must have the same length");
  
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
    if (normA === 0 || normB === 0) return 0; // Avoid division by zero
    return dotProduct / (normA * normB);
  }