import { PRINCIPAL_NAME } from "@/lib/brand";
import { retrieveVaultRAG } from "@/lib/vault/rag";
import { completeChatCompletion, streamChatCompletion } from "@/lib/ai/chat-provider";
import { buildMessagesWithHistory } from "@/lib/agents/chat-history";
import type { AgentChatHistoryMessage } from "@/lib/agents/types";

async function vaultContextBlock(userMessage: string): Promise<string> {
  const rag = await retrieveVaultRAG(userMessage);
  return rag.context ? `\n\n${rag.context}` : "";
}

export const ARIES_SYSTEM_PROMPT = `Kamu adalah ARIES AI Analyst, asisten bisnis pribadi untuk ${PRINCIPAL_NAME} (PT Lemorax).

PT Lemorax adalah perusahaan retail produk kebersihan dan laundry supply dengan 12 cabang di Indonesia: Medan, Palembang, Tangerang, Jakarta Pusat, Jakarta Selatan, Bandung, Bekasi, Semarang, Yogyakarta, Surabaya, Bali, dan Makassar. Produk utama: deterjen laundry, sabun cuci, cairan pembersih, pewangi pakaian. Revenue stream: B2B (hotel, rumah sakit, laundry besar) dan B2C (e-commerce, retail store). Data mencakup periode Januari 2024 hingga April 2026. Total karyawan: 150 orang.

ARIES adalah platform Business Intelligence custom yang dibangun untuk PT Lemorax.

Selalu panggil user **${PRINCIPAL_NAME}**. Jangan sebut "owner".

DATABASE SCHEMA (PostgreSQL - Supabase):

1. employees: employee_id (PK), nama_lengkap, cabang, departemen, jabatan, tanggal_bergabung, gaji_pokok, status
2. kpi: periode (YYYY-MM), employee_id (FK), nama, cabang, departemen, jabatan, kategori_kpi, target, actual, achievement_pct, status (Excellent/On Track/Warning/Below Target)
3. absensi: periode, minggu_ke, employee_id (FK), nama, cabang, jabatan, hadir, sakit, izin, alfa, terlambat, wfh, total_hari_kerja
4. sales_report: transaction_id (PK), periode, tanggal, employee_id (FK), sales_name, cabang, tipe (B2B/B2C), produk, qty, harga_satuan, total, status (Closed/Pending/Cancelled), channel
5. crm: deal_id (PK), periode, nama_perusahaan, tipe_bisnis, kota, cabang_handler, account_manager, am_employee_id, nama_owner, jabatan_owner, no_hp_owner, email_owner, tanggal_lahir_owner, nilai_deal, status (Closed Won/Closed Lost/Negotiation/Proposal/Prospecting), produk_utama, frekuensi_order, last_follow_up, tanggal_closed, notes
6. finance: periode, cabang, tipe (Pemasukan/Pengeluaran), kategori, keterangan, jumlah, metode_pembayaran, referensi
7. marketing: periode, campaign_name, channel, target_audience, budget, spend, impressions, clicks, ctr_pct, conversions, conv_rate_pct, revenue_generated, roas, cpl, status
8. social_media_profiles: id (PK), platform, username, display_name, followers, following, posts_count, engagement_rate, conversion_rate, profile_views, link_clicks, conversions, bio, synced_at
9. social_media_posts: id (PK), profile_id (FK), platform, caption, media_type, published_at, likes, comments, shares, saves, reach, impressions, engagement_rate, clicks, conversions
10. content_plan_items: id (PK), title, brand_scope (personal|company), status (backlog|scripting|review|scheduled|published), format (reel|carousel|image|story), script_md, notes, scheduled_at, published_at, publish_mode, assigned_agent, created_by, position


FORMAT ANGKA dalam jawaban final:
- Rupiah: gunakan pemisah titik (Rp 1.234.567)
- Persentase: satu desimal dengan koma (85,5%)
- Tanggal: format Indonesia (1 Januari 2024)`;

export const ARIES_SQL_PROMPT = `INSTRUKSI PENTING:
1. Analisa pertanyaan user secara mendalam dan identifikasi tabel & kolom yang relevan
2. Generate SQL query PostgreSQL yang VALID dan efisien untuk menjawab pertanyaan
3. Kembalikan response dalam format JSON VALID dengan struktur TEPAT:
   {"sql_query": "SELECT ...", "explanation": "Penjelasan singkat query ini", "initial_analysis": "Analisa awal sebelum data diterima"}
4. Query harus read-only (SELECT only, tidak boleh INSERT/UPDATE/DELETE)
5. Gunakan LIMIT yang wajar (maksimal 1000 rows) untuk mencegah overload
6. Pastikan JSON valid — tidak ada karakter escape yang salah
7. DILARANG KERAS menggunakan CTE (klausa WITH). Query HARUS diawali dengan kata SELECT.`;

export const ARIES_FINAL_ANSWER_PROMPT = `Berdasarkan pertanyaan user dan data yang diberikan, berikan analisa bisnis yang:
1. Langsung menjawab pertanyaan dengan angka konkret
2. Memberikan interpretasi: apakah angka ini bagus/buruk? Dibanding apa?
3. Menyebutkan pattern atau insight menarik yang terlihat dari data
4. Memberikan rekomendasi actionable jika relevan
5. Menggunakan bahasa Indonesia yang profesional tapi mudah dipahami
6. Format angka Rupiah dengan pemisah titik, persentase dengan koma
7. Gunakan bullet points atau numbering untuk readability
8. Jika data kosong atau tidak ada, jelaskan kemungkinan penyebabnya`;

/** @deprecated use ARIES_SYSTEM_PROMPT */
export const LEMORAX_SYSTEM_PROMPT = ARIES_SYSTEM_PROMPT;
/** @deprecated use ARIES_SQL_PROMPT */
export const LEMORAX_SQL_PROMPT = ARIES_SQL_PROMPT;
/** @deprecated use ARIES_FINAL_ANSWER_PROMPT */
export const LEMORAX_FINAL_ANSWER_PROMPT = ARIES_FINAL_ANSWER_PROMPT;

const FINAL_ANSWER_MAX_TOKENS = 4096;

/** Keep prompt payload bounded so local models don't exhaust num_ctx. */
function formatQueryResultForPrompt(queryResult: unknown, maxChars = 14_000): string {
  if (queryResult == null) return "null";
  const json = JSON.stringify(queryResult, null, 2);
  if (json.length <= maxChars) return json;

  if (Array.isArray(queryResult)) {
    const preview = queryResult.slice(0, 40);
    return JSON.stringify(
      {
        _truncated: true,
        row_count: queryResult.length,
        preview_rows: preview,
        note: `Dataset ${queryResult.length} baris — analisis dari sample 40 baris pertama.`,
      },
      null,
      2
    );
  }

  return `${json.slice(0, maxChars)}\n... [data dipotong untuk muat context model]`;
}

export async function generateSQLQuery(
  userMessage: string,
  history?: AgentChatHistoryMessage[]
): Promise<{
  sql_query: string;
  explanation: string;
  initial_analysis: string;
}> {
  const vaultBlock = await vaultContextBlock(userMessage);

  const { content } = await completeChatCompletion({
    messages: buildMessagesWithHistory(
      ARIES_SYSTEM_PROMPT +
        vaultBlock +
        "\n\n" +
        ARIES_SQL_PROMPT +
        "\n\nGunakan riwayat percakapan jika pertanyaan user merujuk ke topik sebelumnya (mis. 'yang tadi', 'cabang itu', 'bulan ini' setelah dibahas).",
      history,
      `Pertanyaan: ${userMessage}\n\nKembalikan HANYA JSON valid dengan format: {"sql_query": "...", "explanation": "...", "initial_analysis": "..."}`
    ),
    maxTokens: 1000,
    temperature: 0.1,
  });

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  return JSON.parse(jsonMatch[0]);
}

export async function* streamDirectAnswer(
  userMessage: string,
  history?: AgentChatHistoryMessage[]
): AsyncGenerator<string> {
  const vaultBlock = await vaultContextBlock(userMessage);

  yield* streamChatCompletion({
    messages: buildMessagesWithHistory(
      ARIES_SYSTEM_PROMPT +
        vaultBlock +
        `\n\nJawab pertanyaan ${PRINCIPAL_NAME} dengan ringkas dan profesional. Prioritaskan Company Vault untuk kebijakan/SOP/konteks internal. Gunakan riwayat percakapan untuk pertanyaan lanjutan — jangan bertanya ulang hal yang sudah dibahas. Jika pertanyaan membutuhkan angka baru dari database, sarankan menanyakan data spesifik (cabang, periode, metrik).`,
      history,
      userMessage
    ),
    maxTokens: 1500,
    temperature: 0.4,
  });
}

export async function* streamFinalAnswer(
  userMessage: string,
  queryResult: unknown,
  sqlQuery: string,
  history?: AgentChatHistoryMessage[],
  options?: { continue?: boolean; originalQuestion?: string }
): AsyncGenerator<string> {
  const vaultBlock = await vaultContextBlock(userMessage);

  const dataBlock = formatQueryResultForPrompt(queryResult);
  const userContent = options?.continue
    ? `Pertanyaan lanjutan ${PRINCIPAL_NAME}: "${userMessage}"\n\nPertanyaan data asli: "${options.originalQuestion ?? userMessage}"\n\nSQL Query:\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\nData hasil query:\n${dataBlock}\n\nLanjutkan analisis dari jawaban sebelumnya yang terpotong. Jangan ulangi ranking/poin yang sudah dijelaskan — langsung sambung dari titik terakhir.`
    : `Pertanyaan ${PRINCIPAL_NAME}: "${userMessage}"\n\nSQL Query yang dijalankan:\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\nData hasil query:\n${dataBlock}\n\nBerikan analisa bisnis yang komprehensif berdasarkan data di atas. Selesaikan semua poin/ranking — jangan berhenti di tengah daftar.`;

  yield* streamChatCompletion({
    messages: buildMessagesWithHistory(
      ARIES_SYSTEM_PROMPT + vaultBlock + "\n\n" + ARIES_FINAL_ANSWER_PROMPT,
      history,
      userContent
    ),
    maxTokens: FINAL_ANSWER_MAX_TOKENS,
    temperature: 0.3,
  });
}
