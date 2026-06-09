import { Suspense } from "react";
import WorkspacePage from "./page";

export default function WorkspaceRoute() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
          Loading workspace…
        </div>
      }
    >
      <WorkspacePage />
    </Suspense>
  );
}
