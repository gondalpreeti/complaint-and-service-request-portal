# Reports & Analytics Module Export

A clean, self-contained export of ONLY the files, backend code, SQL queries, frontend components, and integration diffs created specifically for the **Reports & Analytics** feature.

---

## 📁 Directory Structure

```text
reports-module-export/
├── backend/
│   └── app/
│       ├── routers/
│       │   └── reports.py              # Reports REST API endpoints (/summary, /table, /export)
│       ├── schemas/
│       │   └── reports.py              # Pydantic schemas and validation models
│       └── services/
│           └── report_queries.py       # SQL aggregation & reporting service functions
├── frontend/
│   └── src/
│       ├── api/
│       │   └── reportsApi.js           # Frontend API client with Axios
│       └── components/
│           └── reports/
│               └── ReportsView.jsx     # Main Reports UI (KPIs, Charts, Ledger Table, CSV, Print)
├── sql/
│   ├── reports_kpi_summary.sql         # Standalone SQL: Aggregated KPIs & Lifecycle Metrics
│   ├── reports_category_breakdown.sql  # Standalone SQL: Category Breakdown Query
│   ├── reports_table_ledger.sql        # Standalone SQL: Paginated Ledger & Multi-Field Search
│   └── reports_schema_reference.sql    # Schema & Relation Reference Documentation
├── integration-changes/
│   ├── backend-main-registration.diff  # Patch: Register reports router in backend/app/main.py
│   ├── frontend-sidebar-navigation.diff# Patch: Add Reports item in frontend/src/components/Sidebar.jsx
│   └── frontend-page-routing.diff      # Patch: Render ReportsView in frontend/src/pages/Dashboard.jsx
├── REPORTS_FILE_MANIFEST.txt           # Machine/Git-friendly manifest listing
└── README.md                           # Integration and reference guide
```

---

# Reports & Analytics Files

## Frontend
* `frontend/src/components/reports/ReportsView.jsx`: Complete Reports and Analytics dashboard component including 6 KPI summary cards, 4 visual analytical charts (Status Distribution Pie, Category Breakdown Bar, Priority Breakdown Bar, Complaints Over Time Line chart), paginated complaint records ledger, search/filter sync, CSV download trigger, and Print Report handler.
* `frontend/src/api/reportsApi.js`: API helper methods (`fetchReportsSummary`, `fetchReportsTable`, `getExportReportsCsvUrl`) calling the backend reports endpoints with dynamic filter query parameters.

## Backend
* `backend/app/routers/reports.py`: FastAPI router providing role-guarded (Admin & Manager) endpoints:
  - `GET /api/reports/summary` — Consolidated KPI aggregates and chart distributions
  - `GET /api/reports/table` — Paginated complaint ledger data with dynamic filtering and search
  - `GET /api/reports/export` — Streamed CSV file download of filtered report dataset
* `backend/app/schemas/reports.py`: Pydantic data schemas:
  - `ReportFilters` — Filter parameters (date_from, date_to, status, category_id, priority, search, pagination)
  - `ReportKPISummary` — Key performance indicator totals, counts, and calculated rates
  - `CategoryReportItem` — Breakdown of complaint volume per category
  - `ComplaintTableRow` — Structured row item for the complaints ledger table
  - `PaginatedComplaintTable` — Paginated wrapper with total count and pagination metadata
  - `ReportSummaryResponse` — Consolidated payload for summary charts and KPIs
* `backend/app/services/report_queries.py`: PostgreSQL queries executed asynchronously using `asyncpg` with thread safety and parameterized input sanitization.

## SQL
* `sql/reports_kpi_summary.sql`: Raw SQL query aggregating complaints by status lifecycle stages (`pending`, `assigned`, `in progress`, `resolved`, `closed`).
* `sql/reports_category_breakdown.sql`: Raw SQL query computing category-wise totals, resolved volumes, and open pending complaints.
* `sql/reports_table_ledger.sql`: Raw SQL query performing multi-table joins (`complaints` + `service_request` + `categories`) for the paginated report ledger.
* `sql/reports_schema_reference.sql`: Comprehensive reference schema defining required tables, primary keys, and foreign keys.

## Existing Files With Required Reports Changes

Only 3 existing shared project files require minimal connections:

1. `backend/app/main.py`
   - **Reports Change**: Import `reports` router and register with `app.include_router(reports.router)`.
   - **Diff**: See `integration-changes/backend-main-registration.diff`.

2. `frontend/src/components/Sidebar.jsx`
   - **Reports Change**: Add `{ id: "reports", label: "Reports & Analytics", icon: ... }` to `navItems`.
   - **Diff**: See `integration-changes/frontend-sidebar-navigation.diff`.

3. `frontend/src/pages/Dashboard.jsx`
   - **Reports Change**: Import `ReportsView` and conditionally render `{activeTab === "reports" && <ReportsView />}`.
   - **Diff**: See `integration-changes/frontend-page-routing.diff`.

## Files NOT Included
The following files/folders from previous work or other modules have been **strictly excluded**:
- ❌ **Old Dashboard Frontend**: `frontend/src/components/dashboard/*`, `frontend/src/api/dashboardApi.js`, `frontend/src/hooks/useDashboardData.js`
- ❌ **Old Dashboard Backend**: `backend/app/routers/dashboard.py`, `backend/app/services/dashboard_queries.py`, `backend/app/schemas/dashboard.py`
- ❌ **Notification Module**: Any notification handlers or schemas
- ❌ **Authentication / User Management**: Base login/auth files, token generators, user services
- ❌ **Secrets & Credentials**: `.env`, `.env.old`, database passwords, JWT secrets
- ❌ **Build Artifacts & Dependencies**: `node_modules/`, `venv/`, `dist/`, `package-lock.json`

---

## 📦 Reports Dependencies

### Frontend Dependencies
* `recharts` (^2.12.7) — Used for rendering Pie charts, Bar charts, and Line charts in `ReportsView.jsx`. *(Already present in frontend `package.json`)*
* `axios` (^1.7.7) — Used for executing REST API requests to `/api/reports/*`. *(Already present in frontend `package.json`)*
* `react` (^18.3.1) & `react-dom` — Core React framework. *(Already present in frontend)*

### Backend Dependencies
* `fastapi` (>=0.110) — Web framework for endpoints. *(Already present in backend)*
* `asyncpg` (>=0.29) — High-performance async PostgreSQL driver. *(Already present in backend)*
* `pydantic` (>=2.6) — Data validation and response models. *(Already present in backend)*

---

## 🚀 How to Integrate into Your GitHub Branch

### Step 1: Copy Reports Files into Your Repository
From this export folder:
1. Copy `backend/app/routers/reports.py` ➔ `your-repo/backend/app/routers/`
2. Copy `backend/app/schemas/reports.py` ➔ `your-repo/backend/app/schemas/`
3. Copy `backend/app/services/report_queries.py` ➔ `your-repo/backend/app/services/`
4. Copy `frontend/src/api/reportsApi.js` ➔ `your-repo/frontend/src/api/`
5. Copy `frontend/src/components/reports/ReportsView.jsx` ➔ `your-repo/frontend/src/components/reports/`

### Step 2: Apply Integration Changes
Apply the patch files located in `integration-changes/` using `git apply`:
```bash
git apply integration-changes/backend-main-registration.diff
git apply integration-changes/frontend-sidebar-navigation.diff
git apply integration-changes/frontend-page-routing.diff
```
*(Or manually add the few lines indicated in each `.diff` file).*

### Step 3: Commit to Your Branch
```bash
git checkout -b feature/reports-analytics
git add backend/app/routers/reports.py backend/app/schemas/reports.py backend/app/services/report_queries.py frontend/src/api/reportsApi.js frontend/src/components/reports/ReportsView.jsx
git add backend/app/main.py frontend/src/components/Sidebar.jsx frontend/src/pages/Dashboard.jsx
git commit -m "feat: implement Reports & Analytics module"
git push origin feature/reports-analytics
```
