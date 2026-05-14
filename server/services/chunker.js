const CHUNK_SIZE = 4000;
const OVERLAP = 200;

export function chunkFile(filePath, content) {
  const lines = content.split('\n');
  const chunks = [];
  let pos = 0;

  while (pos < content.length) {
    let end = pos + CHUNK_SIZE;

    if (end < content.length) {
      // Try to break at a function/class boundary or blank line
      const searchStart = Math.max(pos + CHUNK_SIZE - 300, pos);
      const snippet = content.slice(searchStart, end + 200);

      // Look for natural break points: blank line before a function/class def
      const boundaryMatch = snippet.match(/\n\n(?=\s*(function|class|const|export|def|func|public|private|async)\s)/);
      if (boundaryMatch) {
        end = searchStart + boundaryMatch.index + 2;
      } else {
        // Fall back to last newline within range
        const lastNewline = content.lastIndexOf('\n', end);
        if (lastNewline > pos) end = lastNewline + 1;
      }
    } else {
      end = content.length;
    }

    const chunkContent = content.slice(pos, end);
    const startLine = content.slice(0, pos).split('\n').length;
    const endLine = startLine + chunkContent.split('\n').length - 1;

    chunks.push({
      filePath,
      content: chunkContent,
      startLine,
      endLine,
    });

    pos = Math.max(pos + 1, end - OVERLAP);
  }

  return chunks;
}

export function chunkFiles(files) {
  return files.flatMap(f => chunkFile(f.path, f.content));
}
