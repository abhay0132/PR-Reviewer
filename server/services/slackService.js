/**
 * Formats a structured review JSON into Slack Block Kit blocks.
 * Each section gets its own block with emoji headers — scannable, not exhaustive.
 */

function truncate(text, max = 280) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function issueLines(items) {
  if (!items || items.length === 0) return '_None found_ 👍';
  return items
    .map(item => {
      if (typeof item === 'string') return `• ${truncate(item)}`;
      const loc = item.file ? ` _(${item.file}${item.line ? `:${item.line}` : ''})_` : '';
      return `• ${truncate(item.issue)}${loc}`;
    })
    .join('\n');
}

export function formatReviewForSlack(review, prTitle) {
  const blocks = [];

  // Header
  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: '🤖 PR Reviewer', emoji: true },
  });

  if (prTitle) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Reviewing:* ${truncate(prTitle, 120)}` },
    });
  }

  blocks.push({ type: 'divider' });

  // Summary
  if (review.summary) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*📋 Summary*\n${truncate(review.summary, 400)}` },
    });
  }

  // Bugs
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*🐛 Bugs*\n${issueLines(review.bugs)}` },
  });

  // Architectural Conflicts
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*🏗️ Architectural Conflicts*\n${issueLines(review.architectural_conflicts)}` },
  });

  // Security
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*🔒 Security*\n${issueLines(review.security)}` },
  });

  // Code Smell
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*🧹 Code Smell*\n${issueLines(review.code_smell)}` },
  });

  // Positives
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: `*✅ Positives*\n${issueLines(review.positive)}` },
  });

  // Suggested Action
  if (review.suggested_action) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*💡 Suggested Action*\n${truncate(review.suggested_action, 400)}` },
    });
  }

  return { blocks, response_type: 'in_channel' };
}
