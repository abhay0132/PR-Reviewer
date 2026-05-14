import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const SYSTEM_PROMPT = `You are a senior software engineer who has read the entire codebase of this repository. Review the provided PR diff in the context of the existing codebase. Be specific — reference actual file names, function names, and patterns from the codebase context provided. Identify real issues, not hypothetical ones.

Return ONLY valid JSON — no markdown fences, no explanation, just the JSON object.`;

export async function reviewPR({ title, description, diff, changedFiles, codebaseContext }) {
  const contextSection = codebaseContext.length > 0
    ? `\n\n## Relevant Codebase Context\n\n${codebaseContext.map(c =>
        `### ${c.file_path} (lines ${c.start_line}–${c.end_line})\n\`\`\`\n${c.content}\n\`\`\``
      ).join('\n\n')}`
    : '';

  const changedFilesList = changedFiles.map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n');

  const prompt = `${SYSTEM_PROMPT}

## PR Title
${title}

## PR Description
${description || '(none)'}

## Changed Files
${changedFilesList}

## PR Diff
\`\`\`diff
${diff.slice(0, 20000)}
\`\`\`
${contextSection}

## Task
Review this PR and return a JSON object with this exact structure:
{
  "summary": "Brief description of what this PR does",
  "architectural_conflicts": [
    { "issue": "...", "file": "...", "line": 0 }
  ],
  "bugs": [
    { "issue": "...", "file": "...", "line": 0 }
  ],
  "security": [
    { "issue": "...", "file": "...", "line": 0 }
  ],
  "code_smell": [
    { "issue": "...", "file": "...", "line": 0 }
  ],
  "positive": [
    "What the contributor did well"
  ],
  "suggested_action": "What the reviewer should ask the contributor to fix"
}

Return only the JSON. No markdown. No explanation.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown fences if Gemini wraps the response
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}
