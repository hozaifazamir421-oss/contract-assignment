# Contract Obligation and Renewal Assistant

An information-management tool for contracts. A user uploads a contract (PDF, DOCX or pasted text). An AI workflow extracts parties, dates, renewal, termination, notice clauses and obligations, and cites the exact source section for each item. The user reviews every item (approve, edit or reject). Deadlines are then calculated by plain code, never by the AI. This tool is **not legal advice**.

- Live app: https://contract-assignment-umber.vercel.app/
- API: https://contract-assistant-84zz.onrender.com (health check: `/api/health`)
- Repository: https://github.com/hozaifazamir421-oss/contract-assignment

> The API runs on a free Render instance. If nobody used it for 15 minutes it sleeps, and the first request can take about a minute to wake it. An upload also takes around a minute because of the AI call.

## What it does

1. **Upload** a contract (PDF, DOCX, TXT or pasted text, up to 10 MB).
2. **AI extraction** (Gemini) returns items of these types: party, effective date, expiry, renewal, termination, notice, obligation, unclear term, conflict.
3. **Citations**: each item carries the section name and an exact quote. The server checks that the quote really appears in the contract text. If it does not, the item is marked `uncertain` and gets a citation warning.
4. **Confirmed vs uncertain**: every item has a status. Ambiguous clauses also get a clarification question.
5. **Human review**: the user can approve, reject or edit each item. Edits are flagged, and the original AI version is kept untouched.
6. **Dashboard**: upcoming deadlines for approved items, sorted by date, with days left or overdue, and an explanation of how each date was calculated.
7. **Versions**: uploading a new version keeps the old one. Items approved on older versions are marked **potentially stale** until the user approves them again.
8. **Reviewed summary**: built only from approved items of the latest version, with source sections, calculated dates and the disclaimer. It can be copied or downloaded as text.

## Architecture

```
React (Vite)  --HTTP/JSON-->  Express API  -->  MongoDB Atlas
 Vercel                        Render           (Mongoose models)
                                  |
                                  +--> Gemini (extraction only)
```

Key design decisions:

- **The AI extracts raw facts only** (for example "60 days", "before", "expiry date"). All date arithmetic is plain deterministic code in `backend/utils/dates.js`, working in UTC, so results do not depend on the AI or the server's time zone.
- **The AI is called before anything is saved**, so a failed AI call leaves no half-saved contract.
- **Citation verification** compares each quote with the contract text after normalising whitespace, quotes and case.
- **Every upload is a `ContractVersion`** with its own text and its own items. Stale marking is applied when a new version arrives and cleared when the user re-approves.

Folders:

```
backend/
  server.js            app setup, request logging, health check
  routes/contracts.js  all contract endpoints
  models/              Contract, ContractVersion, Item
  AiService/           Gemini extraction and citation verification
  utils/               dates, summary, text extraction, logger, AI logging
  testDates.js, testSummary.js
frontend/src/
  pages/               Home, ContractPage
  components/          UploadForm, ItemCard, DashboardTab, VersionsTab, SummaryTab
samples/               sample contracts to try
```

## Run it locally (Windows / PowerShell)

Requirements: Node 20.19+ (22.12+ recommended), a MongoDB Atlas database, and a Google AI Studio API key.

```powershell
git clone https://github.com/hozaifazamir421-oss/contract-assignment.git
cd contract-assignment

cd backend
npm install
copy .env.example .env      # then fill in the values
npm run dev                 # or: node server.js

# in a second terminal
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173.

### Environment variables (names only)

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `MONGODB_URI` | MongoDB Atlas connection string, ending with the database name |
| `backend/.env` | `GEMINI_API_KEY` | Google AI Studio key |
| `backend/.env` | `PORT` | Port (default 5000; Render sets its own) |
| `backend/.env` | `GEMINI_MODEL` | Optional model override |
| `frontend/.env` | `VITE_API_URL` | Address of the backend API |

## Tests

```powershell
cd backend
npm test
```

- `testDates.js` (21 checks): the deterministic date logic, such as "60 days before 2027-02-28 is 2026-12-30", before/after direction, monthly recurrence, month-end handling, and rejection of impossible dates.
- `testSummary.js` (11 checks): the reviewed summary keeps section order, source sections, calculated dates, edited flags, open questions, the stale-items note, the empty state and the disclaimer.

The AI call itself is not unit tested because its output varies. It is covered by citation verification and by human review.

## Logs

The backend writes one JSON object per line.

- `http.request`: method, path, status, duration.
- `ai.extract.start` / `ai.extract.done` / `ai.extract.failed`: duration, item counts, confirmed vs uncertain, citation warnings, or the error message.
- `contract.create.failed`, `contract.version.failed`: errors.

Contract text and keys are never logged.

## Try it with the sample inputs

Files in `samples/`:

- `sample-contract.txt`, `.docx`, `.pdf`: a fictional services agreement. It has a deliberately vague clause (Section 6) and a deliberate conflict (Section 2 says 60 days notice, Section 7 says 30 days). Expect uncertain items and a conflict item.
- `sample-contract-v2.txt`: an amendment. Upload it on the Versions tab of a reviewed contract to see stale marking.

Suggested path: upload a sample, approve the Expiry and Notice items on the Review tab, open the Dashboard to see the calculated dates, upload v2, then check the stale badges and the Summary.

## API summary

| Method and path | Purpose |
|---|---|
| `GET /api/health` | Server and database status |
| `POST /api/contracts` | Create contract and version 1 (`file` or `text`, optional `title`) |
| `GET /api/contracts` | List contracts |
| `GET /api/contracts/:id` | Contract, versions and items |
| `PATCH /api/contracts/items/:itemId` | Approve, reject or edit an item |
| `GET /api/contracts/:id/dashboard` | Upcoming deadlines and undated items |
| `POST /api/contracts/:id/versions` | Upload a new version |
| `GET /api/contracts/:id/versions/:number` | Read one version |
| `GET /api/contracts/:id/summary` | Reviewed summary |

## Completed scope

Upload (PDF, DOCX, pasted text), AI extraction with source citations, confirmed/uncertain status, clarification questions, human review with edit history, deterministic reminder dates, dashboard, versioning with stale marking, reviewed summary, loading/empty/validation/success/error states, structured logs, tests, deployment.

## Excluded scope

- Optional organisational policy document: **not implemented**.
- E-signatures, external calendar integration, OCR for scanned PDFs, payments, legal recommendations.
- Authentication and per-user data separation.

## Known limitations

- **No login**: anyone with the link sees all contracts. Do not upload real confidential contracts.
- **AI output varies between runs.** The same file can yield a different number of items, and clauses can be missed. This is why human review is central, and why nothing reaches the dashboard or summary until approved.
- **Slow uploads**: one extraction takes roughly 20 to 70 seconds.
- **Free hosting**: the API sleeps after 15 minutes idle, and the first request can take about a minute.
- **PDF reader**: PDFs are read with `pdfjs-dist`. The first version used `pdf-parse`, which failed intermittently with "bad XRef entry" on the hosted server, so it was replaced. Only text-based PDFs are supported; scanned PDFs are not.
- **Deadlines**: calculated for exact dates, "N days before/after the expiry or effective date", and monthly repeats. Clauses relative to other events (for example "within 15 days of receiving an invoice") are shown without a calendar date.
- **Database access**: the Atlas IP allowlist is open (0.0.0.0/0) so the hosted server can connect. The database user and password protect it.
- Local and live environments currently point at the same database.

## Deployment

- **Backend**: Render web service, root directory `backend`, build `npm install`, start `node server.js`, environment variables `MONGODB_URI`, `GEMINI_API_KEY`, `NODE_VERSION=22.12.0`.
- **Frontend**: Vercel, root directory `frontend`, Vite preset, environment variable `VITE_API_URL` set to the Render address. `frontend/vercel.json` rewrites all routes to `index.html` so page refreshes work.
- **Database**: MongoDB Atlas free tier.