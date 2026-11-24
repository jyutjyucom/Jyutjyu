export interface DefinitionTextSegment {
  type: "text" | "word-link";
  text: string;
  word?: string;
}

const CANTO_WORD_LINK_REGEX =
  /#([^\u0000-\u007F\u3000-\u303F\uFF00-\uFFEF\s]+)/g;

/**
 * Split definition or example text into plain text segments and `#詞` cross-reference links.
 */
export function parseDefinitionLinkSegments(
  definition: string,
): DefinitionTextSegment[] {
  if (!definition) return [];

  const segments: DefinitionTextSegment[] = [];
  let lastIndex = 0;

  for (const match of definition.matchAll(CANTO_WORD_LINK_REGEX)) {
    const fullMatch = match[0];
    const word = match[1];
    const startIndex = match.index ?? 0;

    if (startIndex > lastIndex) {
      segments.push({
        type: "text",
        text: definition.slice(lastIndex, startIndex),
      });
    }

    if (word) {
      segments.push({
        type: "word-link",
        text: fullMatch,
        word,
      });
    } else {
      segments.push({ type: "text", text: fullMatch });
    }

    lastIndex = startIndex + fullMatch.length;
  }

  if (lastIndex < definition.length) {
    segments.push({
      type: "text",
      text: definition.slice(lastIndex),
    });
  }

  return segments;
}
