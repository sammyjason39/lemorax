import { Suspense } from "react";
import { VaultApp } from "@/components/vault/VaultApp";

export default function VaultPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Suspense fallback={<div className="p-6 text-sm text-muted">Memuat vault…</div>}>
        <VaultApp />
      </Suspense>
    </div>
  );
}
