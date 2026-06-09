import { StaffAgentsApp } from "@/components/staff-agents/StaffAgentsApp";

export const metadata = {
  title: "AI Agents Staff · ARIES",
  description: "Multi-agent WhatsApp-style workspace for Lemorax",
};

export default function AIAgentsStaffPage() {
  return (
    <div className="page-enter flex-1 min-h-0 h-full">
      <StaffAgentsApp />
    </div>
  );
}
