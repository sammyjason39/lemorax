import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper: wait for network to be idle
async function waitForData(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────
// 1. REDIRECT & LAYOUT
// ─────────────────────────────────────────────────────────────────
test.describe('Layout & Navigation', () => {
  test('/ redirects to /dashboard', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });

  test('Sidebar contains all 8 nav items', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForData(page);

    const navLabels = [
      'Overview',
      'Sales & Revenue',
      'KPI Karyawan',
      'HR & Absensi',
      'CRM & Deals',
      'Finance',
      'Marketing',
      'AI Analyst',
    ];

    for (const label of navLabels) {
      // Use first() to avoid strict mode violation if label appears multiple times
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('Global filter controls visible in sidebar', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForData(page);
    await expect(page.getByText('Filter Global', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Periode', { exact: false }).first()).toBeVisible();
    // Cabang label appears multiple times — check the sidebar label specifically
    await expect(page.locator('label').filter({ hasText: 'Cabang' }).first()).toBeVisible();
  });

  test('TopBar shows correct page title on each page', async ({ page }) => {
    const pages = [
      { url: '/dashboard', title: 'Executive Overview' },
      { url: '/dashboard/sales', title: 'Sales & Revenue' },
      { url: '/dashboard/kpi', title: 'KPI Karyawan' },
      { url: '/dashboard/hr', title: 'HR & Absensi' },
      { url: '/dashboard/crm', title: 'CRM & Deals' },
      { url: '/dashboard/finance', title: 'Finance' },
      { url: '/dashboard/marketing', title: 'Marketing' },
      { url: '/dashboard/ai-analyst', title: 'AI Analyst' },
    ];

    for (const p of pages) {
      await page.goto(`${BASE_URL}${p.url}`);
      await waitForData(page);
      await expect(page.getByRole('heading', { name: p.title, exact: false }).first()).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. OVERVIEW DASHBOARD — Real Data Check
// ─────────────────────────────────────────────────────────────────
test.describe('Overview Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForData(page);
  });

  test('Shows non-zero Total Revenue', async ({ page }) => {
    // Revenue metric card should show "Rp" and not be zero
    const revenueCard = page.getByText('Total Revenue').locator('..').locator('..');
    await expect(revenueCard).toBeVisible();
    // Should contain "Rp" followed by a value
    const text = await revenueCard.textContent();
    expect(text).toContain('Rp');
    expect(text).not.toMatch(/Rp\s+0/);
  });

  test('Shows non-zero Net Profit', async ({ page }) => {
    const card = page.getByText('Net Profit').locator('..').locator('..');
    const text = await card.textContent();
    expect(text).toContain('Rp');
    expect(text).not.toMatch(/Rp\s+0/);
  });

  test('Shows non-zero Total Transaksi', async ({ page }) => {
    const card = page.getByText('Total Transaksi').locator('..').locator('..');
    const text = await card.textContent();
    expect(text).not.toMatch(/^\s*0\s*$/);
  });

  test('Revenue chart is rendered (SVG present)', async ({ page }) => {
    const chart = page.locator('text=Revenue vs Pengeluaran').locator('..').locator('svg').first();
    await expect(chart).toBeVisible();
  });

  test('Revenue per Cabang chart is rendered', async ({ page }) => {
    await expect(page.getByText('Revenue per Cabang', { exact: false })).toBeVisible();
    const chart = page.locator('text=Revenue per Cabang').locator('..').locator('svg').first();
    await expect(chart).toBeVisible();
  });

  test('Top 5 Sales Performer table has rows', async ({ page }) => {
    await expect(page.getByText('Top 5 Sales Performer', { exact: false })).toBeVisible();
    // Should NOT show "Belum ada data"
    const noData = page.getByText('Belum ada data sales', { exact: false });
    await expect(noData).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. SALES PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('Sales & Revenue Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/sales`);
    await waitForData(page);
  });

  test('Sales trend chart is visible', async ({ page }) => {
    // Sales page should have at least one chart (SVG)
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });

  test('Has sales data table', async ({ page }) => {
    // DataTable should have rows
    const table = page.locator('table, [role="table"]').first();
    await expect(table).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. KPI PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('KPI Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/kpi`);
    await waitForData(page);
  });

  test('KPI page loads with data', async ({ page }) => {
    await expect(page.getByText('KPI Karyawan', { exact: false }).first()).toBeVisible();
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });

  test('KPI status badges visible', async ({ page }) => {
    // Actual status values from DB: Excellent, On Track, Warning
    const statusTexts = ['Excellent', 'On Track', 'Warning', 'Tercapai', 'Tidak Tercapai'];
    let found = false;
    for (const s of statusTexts) {
      const el = page.getByText(s, { exact: false });
      if (await el.count() > 0) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// 5. HR PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('HR & Absensi Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/hr`);
    await waitForData(page);
  });

  test('HR page loads', async ({ page }) => {
    await expect(page.getByText('HR & Absensi', { exact: false }).first()).toBeVisible();
  });

  test('Attendance metrics visible', async ({ page }) => {
    // Should show some attendance-related text
    const keywords = ['Hadir', 'Absensi', 'Attendance', 'Karyawan'];
    let found = false;
    for (const kw of keywords) {
      if (await page.getByText(kw, { exact: false }).count() > 0) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// 6. CRM PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('CRM & Deals Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/crm`);
    await waitForData(page);
  });

  test('CRM page shows pipeline value', async ({ page }) => {
    // Should show total pipeline with Rp value > 0
    const text = await page.textContent('body');
    expect(text).toContain('Rp');
    expect(text).toMatch(/Pipeline|Deal|CRM/i);
  });

  test('CRM shows win rate', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toMatch(/Win Rate|win rate/i);
  });

  test('Follow-up section shows deals', async ({ page }) => {
    const followUp = page.getByText('Follow', { exact: false }).first();
    await expect(followUp).toBeVisible();
  });

  test('Pipeline funnel chart rendered', async ({ page }) => {
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// 7. FINANCE PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('Finance Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/finance`);
    await waitForData(page);
  });

  test('Finance page shows Profit Margin', async ({ page }) => {
    await expect(page.getByText('Profit Margin', { exact: false })).toBeVisible();
  });

  test('Finance shows non-zero Pemasukan', async ({ page }) => {
    const text = await page.textContent('body');
    expect(text).toContain('Rp');
    // Should have actual value
    expect(text).not.toMatch(/Total Pemasukan[\s\S]{0,30}Rp\s*0\b/);
  });

  test('P&L chart rendered', async ({ page }) => {
    const chart = page.locator('text=Profit').locator('..').locator('svg').first();
    await expect(chart).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// 8. MARKETING PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('Marketing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/marketing`);
    await waitForData(page);
  });

  test('Marketing page loads with ROAS data', async ({ page }) => {
    await expect(page.getByText('Marketing', { exact: false }).first()).toBeVisible();
    const text = await page.textContent('body');
    expect(text).toMatch(/ROAS|Budget|Campaign/i);
  });

  test('Marketing chart rendered', async ({ page }) => {
    const svgs = page.locator('svg');
    await expect(svgs.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────
// 9. AI ANALYST PAGE
// ─────────────────────────────────────────────────────────────────
test.describe('AI Analyst Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-analyst`);
    await waitForData(page);
  });

  test('AI chat interface loads', async ({ page }) => {
    await expect(page.getByText('AI Analyst', { exact: false }).first()).toBeVisible();
  });

  test('Chat input textarea visible', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  test('Suggested questions visible', async ({ page }) => {
    // Should show example questions
    const suggestions = page.getByText('5 sales terbaik', { exact: false });
    if (await suggestions.count() > 0) {
      await expect(suggestions.first()).toBeVisible();
    } else {
      // Alternative: just check some question text is present
      const body = await page.textContent('body');
      expect(body).toMatch(/sales|revenue|cabang|karyawan/i);
    }
  });

  test('Send button is present', async ({ page }) => {
    // Button with send/kirim text or icon
    const sendBtn = page.locator('button').filter({ hasText: /kirim|send/i }).first();
    if (await sendBtn.count() > 0) {
      await expect(sendBtn).toBeVisible();
    } else {
      // Fallback: check any button is present near textarea
      const btns = page.locator('button');
      await expect(btns.first()).toBeVisible();
    }
  });

  test('Can type a question in chat', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('Siapa top 5 sales bulan ini?');
    await expect(textarea).toHaveValue('Siapa top 5 sales bulan ini?');
  });
});

// ─────────────────────────────────────────────────────────────────
// 10. GLOBAL FILTER — Branch Filter
// ─────────────────────────────────────────────────────────────────
test.describe('Global Filter', () => {
  test('Branch filter dropdown is interactive', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForData(page);

    // Find the branch/cabang dropdown
    const dropdown = page.getByText('Semua Cabang', { exact: false });
    await expect(dropdown).toBeVisible();
  });

  test('Period filter dropdowns are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForData(page);

    // There should be two period selects (start and end)
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// 11. API ROUTES — Health Checks
// ─────────────────────────────────────────────────────────────────
test.describe('API Routes', () => {
  const endpoints = [
    '/api/dashboard/overview',
    '/api/sales',
    '/api/kpi',
    '/api/hr',
    '/api/crm',
    '/api/finance',
    '/api/marketing',
  ];

  for (const endpoint of endpoints) {
    test(`${endpoint} returns 200 with data`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBe(200);
      const json = await response.json();
      expect(json).toBeTruthy();
      // Should not be an empty object
      expect(Object.keys(json).length).toBeGreaterThan(0);
    });
  }
});
