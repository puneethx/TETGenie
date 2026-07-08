# TETGenie 🧞

**Daily mock exam papers for AP TET · SGT · Paper I — in Telugu & English.**
Built from real previous-year papers, powered by Claude 4.6 Opus (via SAP AI Core),
with answers, explanations, scores, leaderboards and shareable result cards.
Mobile-first, with light & dark themes.

> 📚 The full syllabus & topic weightage lives in
> [`AP_TET_Paper1_SGT_Syllabus_README.md`](./AP_TET_Paper1_SGT_Syllabus_README.md).

---

## 🧱 Architecture

```
┌──────────────────┐     Firebase Auth + Firestore + Storage      ┌──────────────┐
│  React + Vite    │  ◄──────────────────────────────────────►   │   Firebase   │
│  (mobile-first)  │        (login, users, papers, scores)        │  (managed)   │
│  Firebase Hosting│                                              └──────────────┘
└────────┬─────────┘
         │  only for AI-heavy jobs
         ▼
┌──────────────────┐     PDF → page images → Claude Vision        ┌──────────────┐
│ Railway backend  │  ──────────────────────────────────────►    │ SAP AI Core  │
│  (Python/FastAPI)│     structured JSON  ◄──────────────────     │ Claude 4.6   │
│  PDF + LLM only  │                                              │ Opus         │
└──────────────────┘                                              └──────────────┘
```

- **Frontend** does auth and all normal data reads/writes **directly** with Firebase — no backend needed for those.
- **Railway backend** is intentionally minimal: it only handles the two AI jobs
  (extracting uploaded PDFs, and generating daily papers), so your Railway usage stays low.
- **No OCR.** We render each PDF page to an image and send it straight to Claude's
  vision — it reads Telugu + English *and* the green "correct answer" marker far more
  accurately than Tesseract/PaddleOCR, and needs **zero** system dependencies.

### Repo layout
```
TETGenie/
├── frontend/                     ← the React + Vite app (this is what you run now)
│   ├── src/
│   ├── firestore.rules           ← Firebase security rules (paste into console)
│   └── .env.example              ← copy to .env and fill in
├── backend/                      ← Railway FastAPI service  (Phase 2 — not built yet)
├── AP_TET_Paper1_SGT_Syllabus_README.md
└── README.md                     ← you are here
```

---

## ✅ Current status — Phases 1, 2 & 3 are DONE

**Phase 1 — Foundation**
- Mobile-first UI with **light/dark themes** (auto-detects system, remembers your choice)
- **Firebase email/password auth** — signup, login, logout
- Signup rules enforced: **password entered twice**, **≥ 8 characters**, **≥ 1 uppercase**,
  first name required, last name optional
- **Roles & subscriptions**: every user is `user`/`free` by default; `admin` and `premium`
  are set manually (see below). Avatar shows a 🛡️ (admin) or ⭐ (premium) badge.
- Role-aware navigation, protected routes, the ₹149 home page.

**Phase 2 — Admin extraction + papers + exam engine**
- **Admin → Upload:** pick one PDF → each page is sent to Claude 4.6 Opus **vision** →
  bilingual questions + options + the green correct-answer + subject/topic/difficulty +
  a 1–2 line explanation (English **and** Telugu). A **live progress screen** shows pages
  processed and questions found; you **review/fix answers**, then **Publish** to Firestore.
- **Admin → Users:** searchable table of everyone; one-tap **Make Premium / Make Free**
  (reflects on the user instantly).
- **Previous-year papers** (free for all): a papers list, a bilingual **study view**
  (answer key + explanations, Telugu/English/Both toggle), and a full **exam engine** with
  two modes — *Practice* (answer revealed instantly) and *Exam* (answers at the end) —
  a question palette, timer, scored result card, best-score tracking and a text share.

**Phase 3 — Daily papers, OTP, leaderboard & sharing**
- **Admin → Generate:** builds a 150-question daily paper — ~110 **fresh AI questions**
  (weighted by topic & difficulty ≈ Easy 45 / Medium 75 / Hard 30, like the real exam) plus
  ~40 reused from your previous-year bank, with **duplicate detection & auto-repair** and
  bilingual answers + explanations. You **verify**, **regenerate** any question at a chosen
  difficulty, then **Post** — which reveals a **6-digit OTP** to share on WhatsApp.
- **Premium daily papers:** a dated list; each exam is **locked** until the member enters the
  OTP. Free users see a lock → WhatsApp upsell. Unlocks are recorded per user. The OTP and
  questions are readable **only by Premium members** (enforced by Firestore rules).
- **Leaderboard:** opt-in — after an exam, post your score; per-paper rankings with medals.
- **Shareable result image:** a branded score card (percentage, "Top X%", TETGenie watermark)
  rendered with html2canvas → share to WhatsApp / download.

**All three phases are build-verified; the extraction *and* generation pipelines were
live-tested against SAP AI Core on your real paper.**

---

## 🚀 Run it locally

You need [Node.js 18+](https://nodejs.org). Then:

```bash
cd TETGenie/frontend
npm install
cp .env.example .env      # then fill it in — see Firebase setup below
npm run dev               # open the printed http://localhost:5173 URL
```

> The app **runs even before** you add Firebase keys — the home page works and the
> login/signup screens will simply say "Firebase is not configured yet." Fill in `.env`
> to enable accounts.

📱 **To preview the true mobile experience:** open your browser dev tools, toggle the
device toolbar (Ctrl/Cmd+Shift+M), and pick a phone. Or run `npm run dev -- --host` and
open the Network URL on your phone (same Wi-Fi).

---

## 🔥 Firebase setup (first time — step by step)

Firebase gives us login, the database (Firestore) and file storage — all free to start.

### 1. Create the project
1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. Click **Add project** → name it `tetgenie` (or anything) → Continue.
3. Google Analytics is optional — you can **disable** it → Create project.

### 2. Turn on Email/Password login
1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → click **Email/Password** → toggle **Enable** (the first
   toggle only; you don't need "Email link") → **Save**.

### 3. Create the database (Firestore)
1. Left menu → **Build → Firestore Database** → **Create database**.
2. Choose a location close to your users (e.g. `asia-south1` (Mumbai)) → Next.
3. Start in **Production mode** → Create.
4. Go to the **Rules** tab, delete what's there, paste the contents of
   [`frontend/firestore.rules`](./frontend/firestore.rules), and click **Publish**.

### 4. Turn on Storage (for uploaded PDFs — used in Phase 2)
1. Left menu → **Build → Storage** → **Get started** → accept the default rules for now → Done.

### 5. Get your web config keys
1. Click the **⚙️ gear** (top-left) → **Project settings**.
2. Scroll to **Your apps** → click the **`</>`** (Web) icon.
3. App nickname `tetgenie-web` → **Register app** (skip Hosting for now).
4. You'll see a `firebaseConfig = { apiKey: "...", ... }` block. Copy each value into
   `frontend/.env`:

   | firebaseConfig key   | .env variable                       |
   |----------------------|-------------------------------------|
   | `apiKey`             | `VITE_FIREBASE_API_KEY`             |
   | `authDomain`         | `VITE_FIREBASE_AUTH_DOMAIN`         |
   | `projectId`          | `VITE_FIREBASE_PROJECT_ID`          |
   | `storageBucket`      | `VITE_FIREBASE_STORAGE_BUCKET`      |
   | `messagingSenderId`  | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId`              | `VITE_FIREBASE_APP_ID`              |

5. Restart `npm run dev` (Vite reads `.env` at startup). Sign up — you should land in the app. 🎉

> **Are these keys secret?** No — Firebase web keys are *meant* to be in the browser.
> Your data is protected by the **security rules** you published in step 3, not by hiding keys.

### 6. Make yourself the Admin
1. Sign up normally inside the app with the email you want to be admin.
2. In the Firebase Console → **Firestore Database → Data**.
3. Open the **`users`** collection → find your document (its ID is your user UID).
4. Click the **`role`** field, change its value from `user` to **`admin`** → Update.
5. Refresh the app — you now see the **admin control centre** and 🛡️ badge.

### 7. Mark a user as Premium (manual, per your plan)
Same idea: open that user's doc in Firestore and change **`subscription`** from `free`
to **`premium`**. (Phase 2 adds a one-tap toggle in the admin **Users** screen so you
won't need the console.) Their app updates **instantly** — no re-login needed.

---

## 🤖 The AI backend (`backend/`) — PDF extraction

This small FastAPI service does the two AI-heavy jobs: **(1) extraction** — turning an
uploaded PDF into structured, tagged, bilingual questions using **Claude 4.6 Opus vision**;
and **(2) daily-paper generation** — writing fresh weighted questions with duplicate repair.
Both use your SAP AI Core orchestration deployment and have been **live-tested** on your real paper.

It needs **no OCR, no Firebase service account, and no database** — the frontend polls it for
progress and writes the reviewed questions to Firestore itself. Only dependency of note is
PyMuPDF (pure pip).

### Run the backend locally
```bash
cd TETGenie/backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                    # fill in the values below
uvicorn app.main:app --reload --port 8000
# check: open http://localhost:8000/  → should return service JSON
```
Then set `VITE_AI_BACKEND_URL=http://localhost:8000` in `frontend/.env` and restart the frontend.

For **local dev only**, you can set `DISABLE_AUTH=1` to skip token checks. Never do this in production.

### Backend environment variables
| Variable | What it is |
|---|---|
| `AICORE_TOKEN_URL` | UAA OAuth URL, ending in `/oauth/token` (from your AI Core service key `uaa.url`) |
| `AICORE_CLIENT_ID` / `AICORE_CLIENT_SECRET` | service-key credentials (the secret's `$` is fine here) |
| `AICORE_BASE_URL` | `serviceurls.AI_API_URL` |
| `AICORE_DEPLOYMENT_ID` | your orchestration deployment id |
| `AICORE_MODEL_NAME` | `anthropic--claude-4.6-opus` |
| `FIREBASE_PROJECT_ID` | your Firebase project id (used to verify caller tokens) |
| `ADMIN_EMAILS` | comma-separated admin emails allowed to run extraction (recommended) |
| `CORS_ORIGINS` | your frontend URL(s), comma-separated (`*` for local dev) |

> 🔒 **Auth without a service account:** the backend verifies the caller's Firebase ID token
> against Google's public keys and (if `ADMIN_EMAILS` is set) checks the verified email — so
> only your admin account can run AI jobs, with zero extra Firebase setup.

### Deploy the backend to Railway (first time)
1. Push this repo to GitHub.
2. Go to <https://railway.app> → **New Project → Deploy from GitHub repo** → pick your repo.
3. Railway detects Python. In the service **Settings → Root Directory**, set `backend`.
   (Start command is already in `railway.json` / `Procfile`.)
4. Open the **Variables** tab and add every variable from the table above
   (`CORS_ORIGINS` = your deployed frontend URL; **do not** set `DISABLE_AUTH`).
5. Deploy. Railway gives you a public URL like `https://tetgenie-backend.up.railway.app`.
6. Put that URL in the **frontend's** `VITE_AI_BACKEND_URL`, rebuild & redeploy the frontend.

> 💰 **Keeping Railway usage low:** the service is idle except while you're extracting a paper.
> Extraction of a full ~150-question paper makes ~120 vision calls and can take several minutes —
> that's the main cost, and it only runs when an admin uploads. Everything else (login, browsing
> papers, taking exams, scores) is pure Firebase and never touches Railway.

---

## ☁️ Deploying (when you're ready)

- **Frontend → Firebase Hosting** (free): `npm i -g firebase-tools`, `firebase login`,
  `firebase init hosting` (public dir = `dist`, single-page app = **Yes**), then
  `npm run build && firebase deploy --only hosting`.
- **Backend → Railway**: added in Phase 2 with a one-click deploy guide.

> 💼 **Company-laptop note:** if you can't install tools locally, you can build & deploy
> the frontend straight from GitHub (Firebase Hosting / Vercel both build in the cloud),
> and the Railway backend builds in the cloud too — so local install limits won't block you.

---

## 🗺️ Roadmap

| Phase | Scope | Status |
|------|-------|--------|
| 1 | Foundation: auth, themes, mobile shell, home | ✅ Done |
| 2 | Admin PDF upload → Claude Vision extraction → Firestore; admin user table; view & attempt previous-year papers (Practice/Exam modes, scored results) | ✅ Done |
| 3 | Daily paper generation (AI + bank, dedup, difficulty ratio, topic weightage), admin verify/regenerate, OTP unlock, shareable result **image** card (html2canvas), leaderboard, premium daily list | ✅ Done |

### Where things live (Phase 3)
- Generation backend: `backend/app/blueprint.py` (topic/difficulty allocator), `genprompts.py`, `generate.py` (batched generation + dedup repair), endpoints `POST /generate`, `GET /generate/{id}`, `POST /generate/question` in `main.py`.
- Frontend: `pages/admin/Generate.jsx`, `pages/app/Daily.jsx`, `components/DailyGate.jsx` (premium + OTP), `pages/app/Leaderboard.jsx`, `components/ResultShareCard.jsx`, libs `daily.js` / `leaderboard.js` / `content.js`.
