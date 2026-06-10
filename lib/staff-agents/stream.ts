/** Chunks emitted by staff agent LLM / Composio runners */
export type StaffStreamChunk =
  | { kind: "text"; content: string }
  | { kind: "processing" };

export function isTextChunk(chunk: StaffStreamChunk): chunk is { kind: "text"; content: string } {
  return chunk.kind === "text";
}

/** Remove legacy Composio tool status lines from saved/displayed content */
export function sanitizeAgentContent(text: string): string {
  return text
    .replace(/\n?🔧 \*[^*\n]+\*…?\n?/g, "\n")
    .replace(/\n?🔧 COMPOSIO_[A-Z0-9_]+…?\n?/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
