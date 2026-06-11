import { ARIES_SYSTEM_PROMPT } from "@/lib/openrouter";
import { PRINCIPAL_NAME } from "@/lib/brand";

const TOOL_INSTRUCTION = `
TOOL WAJIB UNTUK DATA BISNIS:
- Gunakan tool query_business_data sebelum menjawab pertanyaan tentang angka, performa, cabang, sales, KPI, HR, CRM, finance, atau marketing PT Lemorax.
- Hanya SELECT read-only. Tanpa CTE/WITH. Maksimal 1000 baris.
- Tabel yang boleh: employees, kpi, absensi, sales_report, crm, finance, marketing.
- Setelah dapat hasil query, jawab dalam Bahasa Indonesia dengan angka konkret dan insight bisnis.
- Format Rupiah pakai titik (Rp 1.234.567), persentase pakai koma (85,5%).
`;

export function buildOpenClawBusinessMessage(
  userMessage: string,
  vaultContext = ""
): string {
  const vaultBlock = vaultContext.trim()
    ? `\n\n${vaultContext}\n\nPrioritaskan fakta Company Vault untuk kebijakan/SOP/konteks internal.`
    : "";

  return `${ARIES_SYSTEM_PROMPT}${vaultBlock}

${TOOL_INSTRUCTION}

Pertanyaan ${PRINCIPAL_NAME}:
${userMessage}`;
}
