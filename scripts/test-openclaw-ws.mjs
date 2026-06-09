import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const url = process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789";
const token = process.env.OPENCLAW_GATEWAY_TOKEN;
const agentId = process.env.OPENCLAW_DEFAULT_AGENT || "main";
const message = process.argv[2] || "ping";

if (!token) {
  console.error("OPENCLAW_GATEWAY_TOKEN required");
  process.exit(1);
}

const ws = new WebSocket(url);
const pending = new Map();
let connectNonce = null;
let connected = false;

function send(method, params) {
  const id = randomUUID();
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ type: "req", id, method, params }));
  });
}

ws.on("message", (raw) => {
  const frame = JSON.parse(raw.toString());
  if (frame.type === "event" && frame.event === "connect.challenge") {
    connectNonce = frame.payload?.nonce;
    send("connect", {
      minProtocol: 4,
      maxProtocol: 4,
      client: {
        id: "gateway-client",
        version: "1.0.0",
        platform: process.platform,
        mode: "backend",
      },
      role: "operator",
      scopes: ["operator.read", "operator.write"],
      caps: [],
      commands: [],
      permissions: {},
      auth: { token },
      locale: "en-US",
      userAgent: "lemorax/1.0.0",
    }).then((hello) => {
      connected = true;
      console.log("connected", hello?.server?.version);
      runChat();
    }).catch((err) => {
      console.error("connect failed", err);
      ws.close();
    });
    return;
  }

  if (frame.type === "event" && frame.event === "chat") {
    console.log("CHAT", JSON.stringify(frame.payload));
    return;
  }

  if (frame.type === "res") {
    const p = pending.get(frame.id);
    if (!p) return;
    pending.delete(frame.id);
    if (frame.ok) p.resolve(frame.payload);
    else p.reject(new Error(JSON.stringify(frame.error)));
  }
});

async function runChat() {
const sessionKey = process.env.OPENCLAW_SESSION || `agent:${agentId}:main`;
  const runId = randomUUID();
  let fullText = "";

  const chatDone = new Promise((resolve) => {
    const handler = (raw) => {
      const frame = JSON.parse(raw.toString());
      if (frame.type !== "event" || frame.event !== "chat") return;
      const p = frame.payload;
      if (p.runId !== runId) return;
      if (p.state === "delta" && p.deltaText) {
        fullText += p.deltaText;
        process.stdout.write(p.deltaText);
      }
      if (p.state === "final" || p.state === "error" || p.state === "aborted") {
        ws.off("message", handler);
        if (!fullText && p.message?.content) {
          for (const block of p.message.content) {
            if (block?.type === "text" && block.text) fullText += block.text;
          }
        }
        resolve({ state: p.state, text: fullText, error: p.errorMessage });
      }
    };
    ws.on("message", handler);
  });

  try {
    const result = await send("chat.send", {
      sessionKey,
      agentId,
      message,
      idempotencyKey: runId,
      timeoutMs: 120000,
    });
    console.log("\nchat.send ack", JSON.stringify(result));
    const final = await Promise.race([
      chatDone,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 120000)),
    ]);
    console.log("\nfinal", final);
  } catch (err) {
    console.error("chat failed", err.message);
  }
  ws.close();
}

ws.on("error", (err) => console.error("ws error", err));
ws.on("close", () => process.exit(connected ? 0 : 1));
