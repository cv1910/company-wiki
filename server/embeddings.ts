import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import crypto from "crypto";
import { articleEmbeddings, sopEmbeddings, articles, sops } from "../drizzle/schema";
import { ENV } from "./_core/env";

// Get database connection
async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return drizzle(process.env.DATABASE_URL);
}

// Generate content hash to detect changes
export function generateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").substring(0, 64);
}

// Generate embedding using the LLM API
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!apiUrl || !apiKey) {
    throw new Error("Embedding API not configured");
  }

  // Clean and truncate text for embedding (max ~8000 tokens)
  const cleanText = text
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .substring(0, 30000); // Limit to ~30k chars

  const response = await fetch(`${apiUrl}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: cleanText,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Embedding API error:", error);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Update or create article embedding
export async function updateArticleEmbedding(articleId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get article content
  const [article] = await db
    .select({ title: articles.title, content: articles.content, excerpt: articles.excerpt })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) return;

  // Combine title, excerpt, and content for embedding
  const textToEmbed = [
    article.title,
    article.excerpt || "",
    article.content || "",
  ].join("\n\n");

  const contentHash = generateContentHash(textToEmbed);

  // Check if embedding exists and is up to date
  const [existing] = await db
    .select()
    .from(articleEmbeddings)
    .where(eq(articleEmbeddings.articleId, articleId))
    .limit(1);

  if (existing && existing.contentHash === contentHash) {
    // Content hasn't changed, no need to regenerate
    return;
  }

  // Generate new embedding
  const embedding = await generateEmbedding(textToEmbed);

  if (existing) {
    // Update existing embedding
    await db
      .update(articleEmbeddings)
      .set({ embedding, contentHash })
      .where(eq(articleEmbeddings.articleId, articleId));
  } else {
    // Insert new embedding
    await db.insert(articleEmbeddings).values({
      articleId,
      embedding,
      contentHash,
    });
  }
}

// Update or create SOP embedding
export async function updateSOPEmbedding(sopId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get SOP content
  const [sop] = await db
    .select({ title: sops.title, description: sops.description })
    .from(sops)
    .where(eq(sops.id, sopId))
    .limit(1);

  if (!sop) return;

  // Combine title and description for embedding
  const textToEmbed = [sop.title, sop.description || ""].join("\n\n");

  const contentHash = generateContentHash(textToEmbed);

  // Check if embedding exists and is up to date
  const [existing] = await db
    .select()
    .from(sopEmbeddings)
    .where(eq(sopEmbeddings.sopId, sopId))
    .limit(1);

  if (existing && existing.contentHash === contentHash) {
    return;
  }

  // Generate new embedding
  const embedding = await generateEmbedding(textToEmbed);

  if (existing) {
    await db
      .update(sopEmbeddings)
      .set({ embedding, contentHash })
      .where(eq(sopEmbeddings.sopId, sopId));
  } else {
    await db.insert(sopEmbeddings).values({
      sopId,
      embedding,
      contentHash,
    });
  }
}

// Semantic search for articles
export async function semanticSearchArticles(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.3
): Promise<Array<{ articleId: number; similarity: number }>> {
  const db = await getDb();
  if (!db) return [];

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Get all article embeddings
  const allEmbeddings = await db.select().from(articleEmbeddings);

  // Calculate similarities
  const results = allEmbeddings
    .map((item) => ({
      articleId: item.articleId,
      similarity: cosineSimilarity(queryEmbedding, item.embedding as number[]),
    }))
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

// Semantic search for SOPs
export async function semanticSearchSOPs(
  query: string,
  limit: number = 10,
  minSimilarity: number = 0.3
): Promise<Array<{ sopId: number; similarity: number }>> {
  const db = await getDb();
  if (!db) return [];

  const queryEmbedding = await generateEmbedding(query);

  const allEmbeddings = await db.select().from(sopEmbeddings);

  const results = allEmbeddings
    .map((item) => ({
      sopId: item.sopId,
      similarity: cosineSimilarity(queryEmbedding, item.embedding as number[]),
    }))
    .filter((item) => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

// Combined semantic search across articles and SOPs
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<Array<{ type: "article" | "sop"; id: number; similarity: number }>> {
  const [articleResults, sopResults] = await Promise.all([
    semanticSearchArticles(query, limit),
    semanticSearchSOPs(query, limit),
  ]);

  const combined = [
    ...articleResults.map((r) => ({ type: "article" as const, id: r.articleId, similarity: r.similarity })),
    ...sopResults.map((r) => ({ type: "sop" as const, id: r.sopId, similarity: r.similarity })),
  ];

  return combined.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

// Find similar articles based on an article's embedding
export async function findSimilarArticles(
  articleId: number,
  limit: number = 5
): Promise<Array<{ articleId: number; similarity: number }>> {
  const db = await getDb();
  if (!db) return [];

  // Get the source article's embedding
  const [sourceEmbedding] = await db
    .select()
    .from(articleEmbeddings)
    .where(eq(articleEmbeddings.articleId, articleId))
    .limit(1);

  if (!sourceEmbedding) return [];

  // Get all other embeddings
  const allEmbeddings = await db.select().from(articleEmbeddings);

  // Calculate similarities (excluding the source article)
  const results = allEmbeddings
    .filter((item) => item.articleId !== articleId)
    .map((item) => ({
      articleId: item.articleId,
      similarity: cosineSimilarity(
        sourceEmbedding.embedding as number[],
        item.embedding as number[]
      ),
    }))
    .filter((item) => item.similarity >= 0.5) // Higher threshold for "similar"
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return results;
}

// Regenerate all embeddings (for initial setup or refresh)
export async function regenerateAllEmbeddings(): Promise<{ articles: number; sops: number }> {
  const db = await getDb();
  if (!db) return { articles: 0, sops: 0 };

  // Get all published articles
  const allArticles = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.status, "published"));

  // Get all published SOPs
  const allSOPs = await db
    .select({ id: sops.id })
    .from(sops)
    .where(eq(sops.status, "published"));

  // Update embeddings (with rate limiting to avoid API overload)
  let articleCount = 0;
  for (const article of allArticles) {
    try {
      await updateArticleEmbedding(article.id);
      articleCount++;
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate embedding for article ${article.id}:`, error);
    }
  }

  let sopCount = 0;
  for (const sop of allSOPs) {
    try {
      await updateSOPEmbedding(sop.id);
      sopCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate embedding for SOP ${sop.id}:`, error);
    }
  }

  return { articles: articleCount, sops: sopCount };
}
