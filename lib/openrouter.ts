import { PRINCIPAL_NAME } from "@/lib/brand";

function getQwenApiUrl(): string {
  const base = process.env.QWEN_API_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("QWEN_API_BASE_URL not configured");
  return `${base}/chat/completions`;
}
const MODEL = process.env.QWEN_MODEL || "qwen3.7-plus";

function getQwenApiKey(): string {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error("QWEN_API_KEY not configured");
  return apiKey;
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

export async function generateSQLQuery(userMessage: string): Promise<{
  sql_query: string;
  explanation: string;
  initial_analysis: string;
}> {
  const apiKey = getQwenApiKey();

  const response = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: ARIES_SYSTEM_PROMPT + "\n\n" + ARIES_SQL_PROMPT },
        {
          role: "user",
          content: `Pertanyaan: ${userMessage}\n\nKembalikan HANYA JSON valid dengan format: {"sql_query": "...", "explanation": "...", "initial_analysis": "..."}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Qwen API error: ${err}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response format");

  return JSON.parse(jsonMatch[0]);
}

export async function* streamDirectAnswer(userMessage: string): AsyncGenerator<string> {
  const apiKey = getQwenApiKey();

  const response = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            ARIES_SYSTEM_PROMPT +
            `\n\nJawab pertanyaan ${PRINCIPAL_NAME} dengan ringkas dan profesional. Jika pertanyaan membutuhkan angka dari database, sarankan menanyakan data spesifik (cabang, periode, metrik).`,
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1500,
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Qwen streaming error: ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}

export async function* streamFinalAnswer(
  userMessage: string,
  queryResult: unknown,
  sqlQuery: string
): AsyncGenerator<string> {
  const apiKey = getQwenApiKey();

  const response = await fetch(getQwenApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: ARIES_SYSTEM_PROMPT + "\n\n" + ARIES_FINAL_ANSWER_PROMPT,
        },
        {
          role: "user",
          content: `Pertanyaan ${PRINCIPAL_NAME}: "${userMessage}"\n\nSQL Query yang dijalankan:\n\`\`\`sql\n${sqlQuery}\n\`\`\`\n\nData hasil query:\n${JSON.stringify(queryResult, null, 2)}\n\nBerikan analisa bisnis yang komprehensif berdasarkan data di atas.`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Qwen streaming error: ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}
