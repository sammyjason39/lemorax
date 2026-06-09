"use client";

import type { StaffAgent } from "@/lib/staff-agents/types";

export function AgentAvatar({
  agent,
  size = 40,
}: {
  agent: Pick<StaffAgent, "name" | "avatarColor" | "emoji">;
  size?: number;
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: agent.avatarColor,
        fontSize: size * 0.45,
      }}
      title={agent.name}
    >
      {agent.emoji || agent.name.charAt(0)}
    </div>
  );
}

export function GroupAvatar({ agents, size = 40 }: { agents: StaffAgent[]; size?: number }) {
  const slice = agents.slice(0, 3);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {slice.map((a, i) => (
        <div
          key={a.id}
          className="absolute rounded-full border-2 flex items-center justify-center text-[10px]"
          style={{
            width: size * 0.55,
            height: size * 0.55,
            background: a.avatarColor,
            borderColor: "var(--bg-primary)",
            top: i === 0 ? 0 : i === 1 ? size * 0.35 : size * 0.15,
            left: i === 0 ? 0 : i === 1 ? size * 0.4 : size * 0.35,
            zIndex: 3 - i,
          }}
        >
          {a.emoji}
        </div>
      ))}
    </div>
  );
}
