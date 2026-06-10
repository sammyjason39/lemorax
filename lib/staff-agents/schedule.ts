import { listAgents, getAgent, listMessages, appendMessage, updateAgent } from "@/lib/staff-agents/store";
import { appendAgentMemory } from "@/lib/staff-agents/memory";
import { collectStaffAgentReply } from "@/lib/staff-agents/llm";
import type { StaffAgent, StaffAgentSchedule, StaffMessage } from "@/lib/staff-agents/types";
import { PRINCIPAL_NAME } from "@/lib/brand";

const TZ = "Asia/Jakarta";

function nowInJakarta(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

function parseTime(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** True if schedule matches current Jakarta weekday + time (within 15 min window). */
export function isScheduleDue(schedule: StaffAgentSchedule, at = nowInJakarta()): boolean {
  if (!schedule.enabled) return false;

  const parsed = parseTime(schedule.time);
  if (!parsed) return false;

  const day = at.getDay();
  if (schedule.weekday !== "*" && schedule.weekday !== day) return false;

  const nowMinutes = at.getHours() * 60 + at.getMinutes();
  const targetMinutes = parsed.hour * 60 + parsed.minute;
  return Math.abs(nowMinutes - targetMinutes) <= 15;
}

function alreadyRanThisSlot(schedule: StaffAgentSchedule, at = nowInJakarta()): boolean {
  if (!schedule.lastRunAt) return false;
  const last = new Date(schedule.lastRunAt);
  const sameDay =
    last.toLocaleDateString("en-CA", { timeZone: TZ }) ===
    at.toLocaleDateString("en-CA", { timeZone: TZ });
  if (!sameDay) return false;

  const parsed = parseTime(schedule.time);
  if (!parsed) return false;
  const slotKey = `${parsed.hour}:${parsed.minute}`;
  const lastInJakarta = new Date(last.toLocaleString("en-US", { timeZone: TZ }));
  const lastSlot = `${lastInJakarta.getHours()}:${String(lastInJakarta.getMinutes()).padStart(2, "0")}`;
  return lastSlot.startsWith(String(parsed.hour)) && sameDay;
}

export type ScheduleRunResult = {
  agentId: string;
  agentName: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  message?: StaffMessage;
  error?: string;
};

function buildSchedulePrompt(agent: StaffAgent): string {
  const now = new Date().toLocaleString("id-ID", { timeZone: TZ });
  return `[JADWAL OTOMATIS — ${agent.schedule.label}]

Tugas terjadwal: ${agent.schedule.action}

Waktu eksekusi: ${now}

Instruksi:
- Ini laporan PROAKTIF dari agent ke ${PRINCIPAL_NAME} (bukan balasan chat).
- Jalankan sesuai peran dan skills kamu.
- Gunakan data Lemorax dari database jika pertanyaan/analisa membutuhkan angka.
- Format: executive summary + bullet insight + 1-2 rekomendasi actionable.
- Bahasa Indonesia, profesional.`;
}

export async function runAgentSchedule(
  agent: StaffAgent,
  options?: { force?: boolean }
): Promise<ScheduleRunResult> {
  const base = {
    agentId: agent.id,
    agentName: agent.name,
    ok: false,
  };

  if (!agent.schedule.enabled && !options?.force) {
    return { ...base, skipped: true, reason: "schedule_disabled" };
  }

  if (!options?.force) {
    if (!isScheduleDue(agent.schedule)) {
      return { ...base, skipped: true, reason: "not_due" };
    }
    if (alreadyRanThisSlot(agent.schedule)) {
      return { ...base, skipped: true, reason: "already_ran_this_slot" };
    }
  }

  const conversationId = `dm-${agent.id}`;
  const history = await listMessages(conversationId);
  const prompt = buildSchedulePrompt(agent);

  let body = "";
  try {
    body = await collectStaffAgentReply(agent, prompt, history);
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Schedule run failed",
    };
  }

  const content = `📅 **Laporan Terjadwal**\n_${agent.schedule.label}_\n\n${body}`;

  const message = await appendMessage({
    conversationId,
    senderType: "agent",
    senderAgentId: agent.id,
    content,
    scheduleRun: true,
  });

  await updateAgent(agent.id, {
    schedule: { ...agent.schedule, lastRunAt: new Date().toISOString() },
  });
  await appendAgentMemory(
    agent.id,
    `[Schedule] ${agent.schedule.action} → ${body.slice(0, 280)}`,
    "schedule"
  );

  return { ...base, ok: true, message };
}

export async function runAllAgentSchedules(options?: {
  force?: boolean;
  agentId?: string;
}): Promise<ScheduleRunResult[]> {
  const agents = options?.agentId
    ? [await getAgent(options.agentId)].filter(Boolean)
    : await listAgents();

  const results: ScheduleRunResult[] = [];
  for (const agent of agents as StaffAgent[]) {
    results.push(await runAgentSchedule(agent, { force: options?.force }));
  }
  return results;
}

export async function runDueAgentSchedules(): Promise<ScheduleRunResult[]> {
  const agents = await listAgents();
  const results: ScheduleRunResult[] = [];
  for (const agent of agents) {
    results.push(await runAgentSchedule(agent, { force: false }));
  }
  return results;
}
