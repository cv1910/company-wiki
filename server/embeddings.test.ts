import { describe, expect, it } from "vitest";
import { generateContentHash, cosineSimilarity } from "./embeddings";

describe("embeddings", () => {
  describe("generateContentHash", () => {
    it("generates consistent hash for same content", () => {
      const content = "Test article content";
      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("generates different hash for different content", () => {
      const hash1 = generateContentHash("Content A");
      const hash2 = generateContentHash("Content B");
      
      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string", () => {
      const hash = generateContentHash("");
      expect(hash).toHaveLength(64);
    });

    it("handles special characters", () => {
      const hash = generateContentHash("Ümläüte & Sönderzeichen!");
      expect(hash).toHaveLength(64);
    });
  });

  describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
      const similarity = cosineSimilarity(vector, vector);
      
      expect(similarity).toBeCloseTo(1, 5);
    });

    it("returns 0 for orthogonal vectors", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const similarity = cosineSimilarity(vector1, vector2);
      
      expect(similarity).toBeCloseTo(0, 5);
    });

    it("returns -1 for opposite vectors", () => {
      const vector1 = [1, 0, 0];
      const vector2 = [-1, 0, 0];
      const similarity = cosineSimilarity(vector1, vector2);
      
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it("returns 0 for vectors of different lengths", () => {
      const vector1 = [1, 2, 3];
      const vector2 = [1, 2];
      const similarity = cosineSimilarity(vector1, vector2);
      
      expect(similarity).toBe(0);
    });

    it("handles zero vectors", () => {
      const vector1 = [0, 0, 0];
      const vector2 = [1, 2, 3];
      const similarity = cosineSimilarity(vector1, vector2);
      
      expect(similarity).toBe(0);
    });

    it("calculates correct similarity for similar vectors", () => {
      const vector1 = [0.8, 0.1, 0.1];
      const vector2 = [0.7, 0.2, 0.1];
      const similarity = cosineSimilarity(vector1, vector2);
      
      // Should be high but not 1
      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1);
    });

    it("handles large vectors", () => {
      const vector1 = Array(1536).fill(0).map((_, i) => Math.sin(i));
      const vector2 = Array(1536).fill(0).map((_, i) => Math.sin(i + 0.1));
      const similarity = cosineSimilarity(vector1, vector2);
      
      // Should be very similar
      expect(similarity).toBeGreaterThan(0.99);
    });
  });
});
