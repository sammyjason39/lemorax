/** Convert github.com blob URL to raw.githubusercontent.com */
export function githubUrlToRaw(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes("raw.githubusercontent.com")) return trimmed;

  const blobMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i
  );
  if (blobMatch) {
    const [, owner, repo, ref, path] = blobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  }

  const treeMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/i
  );
  if (treeMatch) {
    const [, owner, repo, ref, path] = treeMatch;
    const skillPath = path.endsWith("SKILL.md") ? path : `${path.replace(/\/$/, "")}/SKILL.md`;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${skillPath}`;
  }

  return trimmed;
}

export function parseSkillFrontmatter(md: string): {
  name: string;
  description: string;
  tags: string[];
  body: string;
} {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    const firstLine = md.split("\n")[0]?.replace(/^#\s*/, "").trim() || "Imported Skill";
    return { name: firstLine, description: "", tags: [] as string[], body: md };
  }

  const front = match[1];
  const body = match[2].trim();
  let name = "Imported Skill";
  let description = "";
  const tags: string[] = [];

  for (const line of front.split("\n")) {
    const nameMatch = line.match(/^name:\s*(.+)$/i);
    const descMatch = line.match(/^description:\s*(.+)$/i);
    const tagsMatch = line.match(/^tags:\s*\[(.*)\]$/i);
    if (nameMatch) name = nameMatch[1].trim().replace(/^["']|["']$/g, "");
    if (descMatch) description = descMatch[1].trim().replace(/^["']|["']$/g, "");
    if (tagsMatch) {
      tags.push(
        ...tagsMatch[1]
          .split(",")
          .map((t) => t.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean)
      );
    }
  }

  return { name, description, tags, body };
}

export function slugifySkill(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "skill";
}
