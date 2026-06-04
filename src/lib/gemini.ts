/**
 * AI client — server-side only. Backed by Groq (free tier).
 *
 * NEVER import this file in client components or expose GROQ_API_KEY to the browser.
 * All AI calls must go through Next.js server routes/actions.
 *
 * Public interface is unchanged: generateText() and generateJSON<T>().
 * All four AI routes (parse-notes, suggest-prompts, daily-summary, companion)
 * call these functions and require no modification.
 */

import Groq from 'groq-sdk';

const API_KEY = process.env.GROQ_API_KEY ?? '';

const MODEL = 'llama-3.3-70b-versatile';

let _groq: Groq | null = null;

function getClient(): Groq {
  if (!API_KEY) {
    throw new Error(
      'GROQ_API_KEY is not set. Add it to .env.local and restart the dev server.',
    );
  }
  if (!_groq) _groq = new Groq({ apiKey: API_KEY });
  return _groq;
}

/** Race any promise against a hard timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out')), ms),
    ),
  ]);
}

/**
 * Generate text. Optionally accepts a system instruction.
 */
export async function generateText(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 20_000,
): Promise<string> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const call = getClient().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.4,
    max_tokens:  2048,
  });

  const completion = await withTimeout(call, timeoutMs);
  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Same as generateText but strips markdown code fences and parses JSON.
 * Throws if the response isn't valid JSON.
 */
export async function generateJSON<T>(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 25_000,
): Promise<T> {
  const raw   = await generateText(prompt, systemInstruction, timeoutMs);
  const clean = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean) as T;
}
