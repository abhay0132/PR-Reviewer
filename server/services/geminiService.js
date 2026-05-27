import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model fallback list — tries each in order if the previous has no quota
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

const SYSTEM_PROMPT = `You are a senior software engineer reviewing a pull request. Be concise. Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Keep each issue description under 100 words.`;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function generateWithFallback(prompt) {
  for (const modelName of MODELS) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { maxOutputTokens: 8192, temperature: 0.2 },
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`Trying model: ${modelName} (attempt ${attempt + 1})`);
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        const is429 = err.message?.includes('429');
        const isNoQuota = err.message?.includes('limit: 0') || err.message?.includes('PERMISSION_DENIED');

        if (isNoQuota) {
          console.log(`${modelName} has no quota — trying next model`);
          break; // Move to next model immediately
        }

        if (is429 && attempt < 2) {
          const delayMatch = err.message?.match(/"retryDelay":"(\d+)s"/);
          const waitMs = delayMatch ? parseInt(delayMatch[1]) * 1000 + 1000 : 30000;
          console.log(`Rate limited on ${modelName}. Waiting ${Math.round(waitMs / 1000)}s...`);
          await sleep(waitMs);
          continue;
        }

        throw err; // Non-429, non-quota error — surface it
      }
    }
  }
  throw new Error('All Gemini models exhausted their quota. Please try again later.');
}

export async function reviewPR({ title, description, diff, changedFiles, codebaseContext }) {
  const contextSection = codebaseContext.length > 0
    ? `\n\n## Codebase Context\n\n${codebaseContext.slice(0, 5).map(c =>
        `### ${c.file_path} (lines ${c.start_line}–${c.end_line})\n\`\`\`\n${c.content.slice(0, 800)}\n\`\`\``
      ).join('\n\n')}`
    : '';

  const changedFilesList = changedFiles.map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n');

  const prompt = `${SYSTEM_PROMPT}

## PR: ${title}
${description ? `Description: ${description.slice(0, 300)}` : ''}

## Changed Files
${changedFilesList}

## Diff
\`\`\`diff
${diff.slice(0, 8000)}
\`\`\`
${contextSection}

Return this exact JSON (be brief, max 3 items per array):
{
  "summary": "one sentence",
  "architectural_conflicts": [{ "issue": "...", "file": "...", "line": 0 }],
  "bugs": [{ "issue": "...", "file": "...", "line": 0 }],
  "security": [{ "issue": "...", "file": "...", "line": 0 }],
  "code_smell": [{ "issue": "...", "file": "...", "line": 0 }],
  "positive": ["..."],
  "suggested_action": "one sentence"
}`;

  const raw = await generateWithFallback(prompt);

  // Strip markdown code fences if Gemini wraps the response
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract JSON — find first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON found in Gemini response: ${text.slice(0, 300)}`);

  const jsonStr = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
}
