# RoofOps Lemorax Clone Adaptation Plan

> **For Hermes:** Plan only. Execute after Sam confirms direction. Use the existing Lemorax dashboard as the base, but convert it into a frontend-only clickable SaaS mockup for a roofing operations business.

**Goal:** Clone Lemorax into a new folder and adapt the existing dashboard UI into “RoofOps”, a polished static business command center for a residential roofing company.

**Architecture:** Keep the Next.js 14 App Router + Tailwind + Recharts base from Lemorax. Remove runtime dependency on Supabase/OpenRouter/API routes for the showcase path. Replace SWR/API fetching with static typed dummy data in frontend files. Keep the existing dashboard layout pattern, cards, charts, tables, sidebar, and page structure, but rename/re-skin and add missing roofing-specific pages.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS v3, Recharts, lucide-react. No backend, no database, no auth, no persistence.

---

## Current Base Observations

Source repo:

`/Users/samueljason/github/lemorax`

Important existing files:

- `app/dashboard/layout.tsx` has the sidebar shell and main content area.
- `components/layout/Sidebar.tsx` has the navigation and brand block.
- `components/layout/TopBar.tsx` already provides persistent page header, but needs search, notification icon, and profile.
- `components/cards/MetricCard.tsx` can be reused for KPI cards.
- `components/charts/*` can be reused or replaced with generic Recharts components.
- Existing pages under `app/dashboard/*` can be repurposed instead of rebuilt from scratch.
- Current pages fetch from `/api/*` via SWR. RoofOps should not fetch anything.
- Current app is dark-first. RoofOps needs dark sidebar + light content area.

Recommended new folder:

`/Users/samueljason/github/roofops-command-center`

Alternative folder if Sam prefers Indonesian/demo naming:

`/Users/samueljason/github/roofops-demo`

---

## Product Direction

Build as a live-clickable sales/demo mockup, not a real product.

Positioning:

“RoofOps is the single command center for residential roofing operators: leads, estimates, jobs, scheduling, crews, materials, invoices, and owner-level analytics.”

Visual tone:

- SaaS dashboard, not construction website.
- Dark charcoal sidebar.
- Light canvas content.
- Terracotta/deep orange primary accent: `#D9622B`.
- Slate text and borders.
- Real charts with tooltips.
- Tables look populated and operational.
- No lorem ipsum.
- No backend-looking controls that imply persistence unless clearly demo-only.

---

## Scope Decision

Do not implement the whole PRD literally in one giant pass.

Use a phased conversion:

1. Clone and strip risky backend dependencies.
2. Build shared static data model and design tokens.
3. Convert shell: brand, sidebar, topbar, global style.
4. Convert core pages that matter most for demo: Overview, CRM & Leads, Projects & Jobs, Scheduling, Finance.
5. Add remaining pages: Crew, Inventory, Reports, Settings.
6. Polish interactions: row detail panels, filters, kanban, calendar toggle.
7. Verify build and clickable navigation.

This avoids building a huge fresh app while still ending with all 9 pages.

---

## Step-by-Step Plan

### Phase 1: Clone Safely

**Objective:** Create an isolated new project so Lemorax remains untouched.

Commands:

```bash
cd /Users/samueljason/github
cp -R lemorax roofops-command-center
cd roofops-command-center
rm -rf .git .next node_modules .hermes
npm install
```

Then initialize fresh git only after first successful build:

```bash
git init
git add -A
git commit -m "chore: clone Lemorax base for RoofOps mockup"
```

**Why copy not git clone remote:** local Lemorax has the exact working base already inspected. This also avoids accidentally mixing with the source repo’s remote and 11-commit-behind state.

---

### Phase 2: Remove Backend Runtime Dependency

**Objective:** Make the app fully static/client-side.

Likely actions:

- Keep API route files for now only if they do not break build, but stop using them from pages.
- Remove `useSWR` imports from converted pages.
- Replace every `fetch('/api/...')` path with imports from static data.
- Hide or remove `OpenclawChatModal` from `app/dashboard/layout.tsx` because PRD says no AI/backend/API.
- Optionally keep Supabase/OpenRouter packages in `package.json` until final cleanup. Do not spend time removing packages unless build or demo size becomes an issue.

Files:

- Modify: `app/dashboard/layout.tsx`
- Modify: all `app/dashboard/**/page.tsx`
- Create: `lib/roofops-data.ts`
- Create: `lib/roofops-formatters.ts` or adapt `lib/formatters.ts`

Acceptance:

- No visible page depends on `/api/*`.
- App works without env vars.
- App works offline after initial dev server load.

---

### Phase 3: Static Data Model

**Objective:** One canonical dummy dataset that keeps numbers internally consistent.

Create:

`lib/roofops-data.ts`

Data to include:

- `leads`: 60 records
- `jobs`: 40 records
- `invoices`: 25+ records, linked by `jobId`
- `employees`: 15 records across 4 crews
- `inventoryItems`: 30 records, with 3-4 low-stock rows
- `monthlyFinancials`: 12 records with seasonality
- `activities`: 10-20 recent feed records
- `scheduleBlocks`: weekly/monthly calendar entries

Use deterministic hardcoded arrays, not random generation at runtime.

Core types:

```ts
export type LeadStage = 'New Lead' | 'Contacted' | 'Quote Sent' | 'Negotiation' | 'Won' | 'Lost';
export type JobStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'On Hold' | 'Invoiced';
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';
export type CrewStatus = 'Available' | 'On Job' | 'Off';

export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  source: 'Referral' | 'Google Ads' | 'Facebook' | 'Website' | 'Door Knock' | 'Repeat Customer';
  stage: LeadStage;
  estimatedValue: number;
  assignedTo: string;
  lastContactDate: string;
  nextFollowUpDate: string;
  daysInStage: number;
  contactHistory: Array<{ date: string; type: 'Call' | 'Text' | 'Email' | 'Site Visit'; note: string }>;
}
```

Data consistency rules:

- Revenue cards use invoice totals, not independent made-up numbers.
- Active jobs count derives from jobs where status is Scheduled/In Progress/On Hold.
- Completed jobs count derives from jobs status Completed/Invoiced.
- Crew job counts derive from jobs assigned to crew where status completed/invoiced.
- Low stock count derives from quantity <= reorder threshold.
- Overdue amount derives from invoices status Overdue.

Helpers to export:

```ts
export const roofopsMetrics = { ...derived metrics... };
export const getJobsByStatus = () => ...;
export const getLeadFunnelData = () => ...;
export const getRevenueTrend = () => ...;
export const getCrewUtilization = () => ...;
```

---

### Phase 4: Global Rebrand and Visual System

**Objective:** Make it immediately feel like RoofOps, not Lemorax.

Files:

- Modify: `package.json`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/TopBar.tsx`

Changes:

- App name: `roofops-command-center`
- Brand title: `RoofOps`
- Subtitle: `Residential Roofing Command Center`
- Accent: `#D9622B`
- Sidebar background: `#111827` or `#0F172A`
- Main background: `#F6F7F9`
- Cards: white, border `#E5E7EB`, subtle shadow.
- Active sidebar item: orange tint.
- Logo mark: simple orange rounded square with roof/chevron icon from lucide or text `R`.

Topbar requirements:

- Page title + subtitle.
- Search input: “Search leads, jobs, invoices…”
- Notification bell icon with small dot.
- User profile: “Morgan Ellis, Owner” or “Alex Carter, Owner”.
- No global cabang/periode filters from Lemorax except where useful. Reports gets its own date range filter.

Sidebar nav mapping:

- `/dashboard` → Overview
- `/dashboard/crm` → CRM & Leads
- `/dashboard/jobs` → Projects & Jobs
- `/dashboard/scheduling` → Scheduling
- `/dashboard/finance` → Finance
- `/dashboard/crew` → Crew & Employees
- `/dashboard/inventory` → Inventory & Materials
- `/dashboard/reports` → Reports & Analytics
- `/dashboard/settings` → Settings

Remove old nav:

- Sales & Revenue
- KPI Karyawan
- HR & Absensi
- Marketing
- AI Analyst

Possible shortcut:

Reuse existing old route folders by renaming responsibilities:

- `sales` can become `jobs`, but better to create proper folders and leave old unused files deleted or redirected.

---

### Phase 5: Shared UI Components

**Objective:** Avoid repeating dashboard blocks across 9 pages.

Create or adapt:

- `components/roofops/PageHeader.tsx` if TopBar alone is not enough.
- `components/roofops/KpiGrid.tsx`
- `components/roofops/StatusBadge.tsx`
- `components/roofops/DataTable.tsx` or reuse `components/tables/DataTable.tsx`
- `components/roofops/ChartCard.tsx`
- `components/roofops/DetailPanel.tsx`
- `components/roofops/ProgressBar.tsx`
- `components/roofops/KanbanBoard.tsx`
- `components/roofops/CalendarGrid.tsx`

Keep it pragmatic. If an existing component works, use it.

Status colors:

- Won/Paid/Completed: green
- Scheduled/Contacted/Pending: blue
- Negotiation/In Progress: orange
- Lost/Overdue/Low stock: red
- On Hold: amber/slate

---

### Phase 6: Page Conversion Plan

#### 6.1 Overview

File:

`app/dashboard/page.tsx`

Build:

- KPI cards:
  - Total Revenue MTD
  - Active Jobs
  - New Leads This Week
  - Conversion Rate
  - Outstanding Invoices
- Charts:
  - 12-month revenue trend area/line
  - Jobs by status donut
  - Lead sources bar
- Table/feed:
  - Recent Activity

Reuse:

- `MetricCard`
- Recharts line/area, pie/donut, bar.

#### 6.2 CRM & Leads

File:

`app/dashboard/crm/page.tsx`

Build:

- KPI cards:
  - Total Leads This Month
  - Awaiting Follow-up
  - Average Response Time
  - Quote-to-Close Rate
- Kanban board:
  - New Lead, Contacted, Quote Sent, Negotiation, Won, Lost
  - Cards show customer, estimated value, days in stage
  - No real drag persistence. Optional visual drag later, but not necessary for first pass.
- Charts:
  - Funnel chart as horizontal stepped bars
  - Lead source performance stacked/monthly bar
- Table:
  - Full leads list
  - Client-side filters by stage, source, assigned rep
  - Row click opens right detail panel with contact history and notes

#### 6.3 Projects & Jobs

File:

`app/dashboard/jobs/page.tsx`

Build:

- KPI cards:
  - Jobs In Progress
  - Completed This Month
  - Average Job Duration
  - Average Job Value
- Charts:
  - Job status distribution
  - Job value by roof type
- Table:
  - Job ID, customer, address, roof type, crew, dates, status, contract value, payment status
- Detail panel:
  - Timeline/progress bar
  - Materials used
  - Photos placeholder gallery
  - Linked invoice
  - Crew assigned
  - Notes log

#### 6.4 Scheduling

File:

`app/dashboard/scheduling/page.tsx`

Build:

- Toggle: Week / Month
- Main calendar grid with color-coded crew blocks
- Sidebar widget:
  - Unscheduled jobs
  - Crew availability
- Chart:
  - Crew utilization horizontal bars
- Table:
  - Upcoming schedule table or schedule conflicts table, because PRD says every page should have at least one table.

#### 6.5 Finance

File:

`app/dashboard/finance/page.tsx`

Build:

- KPI cards:
  - Revenue YTD
  - Expenses YTD
  - Net Profit Margin
  - Overdue Invoices
- Charts:
  - Revenue vs Expenses grouped bar
  - Revenue by job category donut
  - Cash flow line
- Tables:
  - Invoices list
  - Expenses list

#### 6.6 Crew & Employees

File:

`app/dashboard/crew/page.tsx`

Build:

- KPI cards:
  - Active crew members
  - Currently on job
  - Avg jobs completed per crew
  - Certifications expiring
- Charts:
  - Jobs completed per crew
  - Headcount by role donut
- Table:
  - Employee list
- Detail panel:
  - Job history and performance notes

#### 6.7 Inventory & Materials

File:

`app/dashboard/inventory/page.tsx`

Build:

- KPI cards:
  - Total SKUs
  - Low Stock Alerts
  - Inventory Value
- Chart:
  - Stock levels by category
- Table:
  - Materials list
  - Highlight below reorder threshold with warning background

#### 6.8 Reports & Analytics

File:

`app/dashboard/reports/page.tsx`

Build:

- Date range filter at top.
- Charts:
  - YoY revenue comparison
  - CAC trend
  - Job profitability distribution
  - Seasonal demand pattern
- Table:
  - Profitability by job or monthly performance summary

Since scope is mockup, date range filter can update local state and visually affect labels or filter month arrays. No persistence.

#### 6.9 Settings

File:

`app/dashboard/settings/page.tsx`

Build:

- Company profile cards
- Team/users table
- Notification preferences cards
- Integrations placeholder cards:
  - QuickBooks
  - Google Calendar
  - Twilio
  - CompanyCam
- Chart requirement workaround:
  - Small notification volume chart or integration health donut.
- Table requirement:
  - Users/team management table or audit log table.

---

## Phase 7: Routing Cleanup

**Objective:** Make navigation clean and avoid old Lemorax pages showing.

Files:

- Delete or ignore old routes:
  - `app/dashboard/sales/page.tsx`
  - `app/dashboard/kpi/page.tsx`
  - `app/dashboard/hr/page.tsx`
  - `app/dashboard/marketing/page.tsx`
  - `app/dashboard/ai-analyst/page.tsx`
- Create new routes:
  - `app/dashboard/jobs/page.tsx`
  - `app/dashboard/scheduling/page.tsx`
  - `app/dashboard/crew/page.tsx`
  - `app/dashboard/inventory/page.tsx`
  - `app/dashboard/reports/page.tsx`
  - `app/dashboard/settings/page.tsx`

Optional redirects:

- Old `sales` → `jobs`
- Old `hr` → `crew`
- Old `kpi`/`marketing` → `reports`

For first pass, do not overbuild redirects. Sidebar only needs to point to new routes.

---

## Phase 8: Build Reliability

Known issue from Lemorax:

`next/font/google` previously hung on Google Fonts fetch.

Plan:

- Inspect `app/layout.tsx`.
- If it uses `next/font/google`, replace with system font stack or local CSS variables.
- Use Inter-like fallback: `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- This makes demo build reliable offline.

Verification:

```bash
npm run build
```

If `next lint` prompts or fails due Next 14 lint deprecation/setup, do not block on it. Build is primary.

---

## Execution Order

1. Clone repo to `roofops-command-center`.
2. Install dependencies.
3. Run baseline `npm run build` to know inherited state.
4. Patch fonts if build hangs/fails on Google Fonts.
5. Add `lib/roofops-data.ts` and derived metrics helpers.
6. Patch global style and brand shell.
7. Patch sidebar nav and topbar.
8. Convert Overview.
9. Convert CRM.
10. Convert Jobs.
11. Convert Finance.
12. Add Scheduling.
13. Add Crew.
14. Add Inventory.
15. Add Reports.
16. Add Settings.
17. Remove/hide Openclaw/AI modal.
18. Run `npm run build`.
19. Start dev server on an available port, preferably `1234` if available:

```bash
PORT=1234 npm run dev
```

20. Click through all 9 pages in browser or use curl/build-level checks if browser unavailable.
21. Final report with path, command, build result, and remaining polish options.

---

## What Not To Do

- Do not connect Supabase.
- Do not call any API.
- Do not preserve Lemorax business terms like cabang, KPI Karyawan, absensi, PT Lemorax.
- Do not implement login/auth.
- Do not add real drag-save behavior.
- Do not use lorem ipsum.
- Do not spend time making data generated at runtime. Static hardcoded data is better for demo consistency.
- Do not deploy until Sam sees local result.

---

## Open Questions for Sam

1. Folder name: use `roofops-command-center` or another name?
2. Should the app stay as Next.js, or do we prefer stripping into simpler Vite later? Recommendation: stay Next.js to move fast from Lemorax.
3. Brand voice: keep US roofing company generic, or create a fictional company name inside RoofOps like “Summit Ridge Roofing”? Recommendation: product name `RoofOps`, company profile dummy `Summit Ridge Roofing`.
4. Should we keep all 9 pages in first implementation, or do MVP first with 5 strong pages then fill the rest? Recommendation: all 9, but polish depth prioritized on first 5.

---

## Acceptance Criteria

Given I open the local RoofOps app,
When I click the sidebar navigation,
Then I can view all 9 pages without page reload errors.

Given I open Overview,
When I scan the page,
Then I see roofing-specific KPI cards, charts, and recent activity with realistic values.

Given I open CRM & Leads,
When I use filters and click a lead row,
Then the table filters client-side and a detail panel shows contact history.

Given I open Projects & Jobs,
When I click a job row,
Then I see job timeline, materials, invoice, crew, photos placeholders, and notes.

Given I open Finance,
When I compare KPI cards and invoice table,
Then revenue/outstanding/overdue values are consistent with invoice data.

Given I run `npm run build`,
Then Next.js production build completes without needing env vars, database, Supabase, OpenRouter, or Google Fonts network access.

---

## Recommended First Execution Cut

If Sam says “gas”, execute this cut first:

1. Clone to `/Users/samueljason/github/roofops-command-center`.
2. Add static data.
3. Rebrand shell.
4. Convert Overview, CRM, Jobs, Finance.
5. Add simple versions of Scheduling, Crew, Inventory, Reports, Settings.
6. Build verify.

Then do second pass for polish:

- Better row detail panels.
- Calendar visual polish.
- More realistic data density.
- Mobile responsive refinements.
- Demo route screenshots or local preview.
