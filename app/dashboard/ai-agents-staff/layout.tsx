export default function AIAgentsStaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-y-0 z-20 flex flex-col"
      style={{
        left: 260,
        right: 0,
        background: "var(--bg-primary)",
      }}
    >
      {children}
    </div>
  );
}
