import { Sidebar } from "@/components/layout/Sidebar";
import { OpenclawChatModal } from "@/components/ui/OpenclawChatModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-[1600px] mx-auto">{children}</div>
      </main>
      <OpenclawChatModal />
    </div>
  );
}
