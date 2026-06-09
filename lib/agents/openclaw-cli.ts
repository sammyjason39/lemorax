import { spawn } from "node:child_process";
import type { OpenClawChatInput } from "./types";

type CliAgentResult = {
  status?: string;
  result?: {
    payloads?: Array<{ text?: string | null }>;
  };
  error?: string;
};

export async function runOpenClawCli(input: OpenClawChatInput): Promise<string> {
  const agentId = input.agentId || process.env.OPENCLAW_DEFAULT_AGENT || "main";
  const args = ["agent", "-m", input.message, "--agent", agentId, "--json"];
  if (input.sessionId) args.push("--session-id", input.sessionId);

  const env = { ...process.env };
  if (process.env.OPENCLAW_GATEWAY_TOKEN) {
    env.OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
  }

  return new Promise((resolve, reject) => {
    const child = spawn("openclaw", args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `openclaw exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as CliAgentResult;
        if (parsed.status && parsed.status !== "ok") {
          reject(new Error(parsed.error || `OpenClaw status: ${parsed.status}`));
          return;
        }
        const text = parsed.result?.payloads?.map((p) => p.text ?? "").join("\n").trim();
        if (!text) {
          reject(new Error("OpenClaw returned empty response"));
          return;
        }
        resolve(text);
      } catch {
        reject(new Error(stderr.trim() || stdout.trim() || "Failed to parse OpenClaw JSON output"));
      }
    });
  });
}
