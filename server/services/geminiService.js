import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.2,
  },
});

const SYSTEM_PROMPT = `You are a senior software engineer reviewing a pull request. Be concise. Return ONLY a valid JSON object — no markdown, no explanation, no code fences. Keep each issue description under 100 words.`;

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

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON — find first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`No JSON found in Gemini response: ${text.slice(0, 200)}`);

  const jsonStr = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
}
