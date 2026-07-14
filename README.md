# Splitzy — a Splitwise-style expense splitter (MERN stack)

A complete, working clone of Splitwise's core functionality: groups, friends (with
a real send/accept/reject request flow), shared expenses (equal/exact/percentage/shares
splits, multi-currency), an automatic debt-simplification engine, settle-up with
payment methods, an activity audit trail, and a full account settings page —
built with **MongoDB + Express + React + Node**, ready to deploy on **Vercel**.

This is a real, runnable project. Follow the steps below in order.

---

## 0. What changed in this version (fixes from your feedback + a full audit)

I went back through the whole codebase and found several real gaps beyond what
you'd flagged - fixed all of them:

- **Edit and Delete for expenses, added end-to-end.** Previously the backend
  supported both but nothing in the UI called them - clicking an expense only
  opened a read-only popup. Now every expense list has a working Edit (reuses
  the Add Expense modal, prefilled) and Delete (with confirmation).
- **Security: authorization checks added across group and expense endpoints.**
  Several endpoints (view/edit a group, add a member, view a group's expenses
  or balances, view/edit/delete a specific expense, view a friend's balance)
  had no check that the requester actually belonged there - any logged-in
  user could act on data that wasn't theirs just by knowing/guessing an id.
  Every one of these now verifies membership/participation first.
- **Settle Up currency-tab bug**, **Add Expense redesign**, **dashboard
  group-expense bug**, **friend requests**, **My Account page**, **multi-currency
  totals**, **invisible text**, **autocomplete search** - all from earlier
  rounds, still in place; see the git history / prior notes if you want the
  blow-by-blow.
- Still open (lower priority, not yet built): a "delete group entirely" option
  (only "leave group" exists), real notifications for group invites/payment
  reminders (the schema supports it, nothing triggers it yet), and a
  forgot-password flow.

---

## 1. Install these tools first (one-time setup)

1. **Node.js LTS** (v18 or v20) — https://nodejs.org. Verify with `node -v` and `npm -v`.
2. **VS Code** — https://code.visualstudio.com
3. **A MongoDB database** — the easiest option is a free **MongoDB Atlas** cluster:
   - Register at https://www.mongodb.com/cloud/atlas/register
   - Create a free "M0" cluster.
   - Under "Database Access," create a database user (username + password).
   - Under "Network Access," add `0.0.0.0/0` (allow from anywhere) — needed
     both for your laptop and later for Vercel to reach it.
   - Click "Connect" → "Drivers" → copy the connection string:
     `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`
4. **A free Vercel account** — https://vercel.com/signup (sign up with GitHub,
   it's the smoothest path since Vercel deploys straight from a GitHub repo).
5. **A free GitHub account** (if you don't have one) — https://github.com/signup

### VS Code extensions (Extensions panel — `Ctrl+Shift+X` / `Cmd+Shift+X`)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier – Code formatter** (esbenp.prettier-vscode)
- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **MongoDB for VS Code** (mongodb.mongodb-vscode) — optional, browse your Atlas data inside VS Code
- **Thunder Client** (rangav.vscode-thunder-client) — optional, test API routes without leaving VS Code

You don't install React/Express/MongoDB as VS Code extensions — those come in
via `npm install` in steps 2 and 3 below.

---

## 2. Run the backend locally

Open the `splitwise-clone` folder in VS Code, open a terminal (`` Ctrl+` ``):

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb+srv://yourUser:yourPassword@cluster0.xxxxx.mongodb.net/splitwise?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_you_make_up
CLIENT_URL=http://localhost:5173
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=your_16_character_app_password
EMAIL_FROM_NAME=Splitzy
```
(See section 2.5 right below for how to get `EMAIL_PASS`.)

Start it:
```bash
npm run dev
```
Expected output:
```
MongoDB connected: cluster0-xxxxx.mongodb.net
Server running on port 5000
```
Visit `http://localhost:5000` — you should see `Splitwise Clone API running`.

---

## 2.5. Setting up email verification (signup now sends a real OTP code)

Signing up no longer just creates an account instantly - it emails a 6-digit
code first, and the account is only created once that code is confirmed. This
proves the email address is real and actually reachable (pinging a mail server
to "check if an email exists" doesn't reliably work - most providers, Gmail
included, block that - so a one-time code is the standard way to do this).

By default this uses Gmail's SMTP server, which needs an **App Password** (not
your normal Gmail password - Google blocks plain-password SMTP logins from
apps):

1. Go to https://myaccount.google.com/security and turn on **2-Step Verification**
   if it isn't on already (App Passwords require it).
2. Go to https://myaccount.google.com/apppasswords
3. Under "App name," type something like `Splitzy` and click **Create**.
4. Google shows a 16-character password (spaces don't matter) - copy it.
5. In `backend/.env`, set:
   ```
   EMAIL_USER=youraddress@gmail.com
   EMAIL_PASS=the16characterapppassword
   EMAIL_FROM_NAME=Splitzy
   ```
6. Restart the backend (`npm run dev`). Try signing up with a real email you
   can check - the code should arrive within a few seconds.

**Using a different email provider instead of Gmail?** Add two more variables
to point at their SMTP server instead:
```
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
```
(`EMAIL_USER`/`EMAIL_PASS` become whatever that provider's SMTP credentials are.)

If `EMAIL_USER`/`EMAIL_PASS` aren't set at all, signup will fail with a clear
"Email is not configured" error instead of silently doing nothing.

---

## 3. Run the frontend locally

Open a **second** terminal:
```bash
cd frontend
npm install
npm run dev
```
Vite prints a URL, typically `http://localhost:5173` — open it. You should see
the Splitzy login page.

---

## 4. Using the app

1. **Sign up** (name, email, 6+ char password, default currency) → check your
   inbox for a 6-digit code and enter it to finish creating the account.
2. **Add a friend**: click `+` next to "Friends," search by name/email (you'll
   see a dropdown of real matching accounts), or type a fresh email to invite
   someone new. If you picked an existing account, they'll get a notification
   and must **accept** before they show up as your friend — check the 🔔 bell
   icon (top of the sidebar) to accept/decline requests sent *to* you.
3. **Create a group**: `+` next to "Groups," same search-as-you-type for members.
4. **Add an expense**: pick the currency, who paid, and a split type:
   - **Equal** — auto-divides among everyone checked.
   - **Exact** — type each person's amount; blocked from saving until the
     amounts add up to the total.
   - **Percentage** — must add up to 100%.
   - **Shares** — integer weights; amount is proportional to shares.
5. **Settle up**: available on the Dashboard (per currency), inside a Group, or
   on a Friend's page. Runs the greedy debt-simplification engine and lets you
   record each payment with a method (Cash/UPI/Card).
6. **My Account** (click your name in the sidebar): edit profile, password,
   default currency, timezone, language.
7. **Recent activity**: the audit trail — click any expense entry for a
   read-only detail popup.

---

## 5. Project structure

```
splitwise-clone/
├── backend/
│   ├── app.js                    # Express app (routes, middleware) - exported, no .listen()
│   ├── server.js                 # Local dev entrypoint: imports app.js and calls .listen()
│   ├── api/index.js              # Vercel serverless entrypoint: re-exports app.js
│   ├── vercel.json                # Tells Vercel to route all requests to api/index.js
│   ├── config/db.js              # Mongoose connection
│   ├── models/                   # User, Group, Friendship, Expense, Settlement, Activity, Notification
│   ├── middleware/auth.js        # JWT verification middleware
│   ├── utils/debtSimplify.js     # The cash-flow minimization algorithm (currency-aware)
│   ├── utils/activityLogger.js   # Writes to the Activity audit trail
│   ├── controllers/              # Route handler logic
│   └── routes/                   # Express routers
└── frontend/
    ├── vercel.json               # SPA rewrite rule (so React Router routes survive a refresh)
    ├── src/
    │   ├── main.jsx / App.jsx
    │   ├── context/AuthContext.jsx
    │   ├── api/axios.js
    │   ├── pages/                # Login, Signup, Dashboard, GroupPage, FriendPage, ActivityPage, AllExpensesPage, AccountPage
    │   └── components/           # Sidebar, Typeahead, NotificationsBell, modals, ExpenseCard, Avatar, Layout
    └── tailwind.config.js
```

### Key API endpoints
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/send-otp` | Step 1 of signup: emails a 6-digit code |
| POST | `/api/auth/verify-otp` | Step 2 of signup: confirms the code, creates the account, returns JWT |
| POST | `/api/auth/login` | Auth, returns JWT |
| GET | `/api/users/search?q=` | Typeahead search for existing accounts |
| PUT | `/api/users/me`, `/api/users/me/password` | Account settings page |
| GET | `/api/users/dashboard-summary` | Per-currency balance breakdown |
| POST | `/api/friends/request` | Send a friend request (or auto-invite by email) |
| POST | `/api/friends/:friendshipId/accept` \| `/reject` | Respond to a request |
| GET | `/api/friends/requests` | Incoming pending requests |
| GET | `/api/friends` | Accepted friends only (persistent, balance-independent) |
| GET | `/api/friends/:id` | Friend detail + per-currency settle-up suggestions |
| GET/POST | `/api/groups` | List / create groups |
| GET | `/api/groups/:id/balances` | Per-currency debt-simplification results |
| POST | `/api/expenses` | Create an expense (any split type, any currency) |
| POST | `/api/settlements` | Record a settle-up payment (with method) |
| GET | `/api/activity` | Recent activity feed |
| GET | `/api/notifications` | Notifications (friend requests, etc.) |

---

## 6. Deploying to Vercel (step by step, written for a first-timer)

Vercel deploys straight from a GitHub repository. You'll create **two separate
Vercel projects** from the same repo: one for the backend, one for the frontend.

### Step A — push this project to GitHub
1. Go to https://github.com/new, create a new **empty** repository (e.g. `splitzy`).
2. In VS Code's terminal, from the `splitwise-clone` folder root:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/splitzy.git
   git push -u origin main
   ```

### Step B — deploy the backend
1. In Vercel, click **"Add New" → "Project"** and import your `splitzy` repo.
2. When asked for the **Root Directory**, click "Edit" and choose `backend`.
3. Framework Preset: Vercel should detect "Other" — that's fine, it'll use `vercel.json`.
4. Under **Environment Variables**, add exactly what's in your `backend/.env`:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM_NAME` (see section 2.5 above) — without
     these, signup will fail in production since it can't send the verification code.
   - `CLIENT_URL` — you can fill this in *after* you deploy the frontend (Step C),
     then come back and update it, or just set it to `*` for now and tighten it later.
5. Click **Deploy**. Once done, Vercel gives you a URL like
   `https://splitzy-backend.vercel.app`. Test it by opening
   `https://splitzy-backend.vercel.app/api` in a browser — you should see
   `Splitwise Clone API running`.

### Step C — deploy the frontend
1. Back in Vercel, **"Add New" → "Project"** again, same repo, but this time set
   **Root Directory** to `frontend`.
2. Vercel auto-detects Vite — leave the build settings as default
   (`npm run build`, output directory `dist`).
3. Add one **Environment Variable**:
   - `VITE_API_URL` = `https://splitzy-backend.vercel.app/api` (your backend URL from Step B, with `/api` on the end)
4. Click **Deploy**. You'll get a URL like `https://splitzy.vercel.app` — that's
   your live app.

### Step D — close the loop
Go back to the **backend** project's Environment Variables in Vercel and set
`CLIENT_URL` to your frontend's real URL (`https://splitzy.vercel.app`), then
redeploy the backend (Vercel → your backend project → "Deployments" → "..." →
"Redeploy") so CORS only allows your actual frontend.

From now on, **any `git push` to `main` auto-redeploys both projects** — that's
the main thing Vercel does for you.

---

## 7. Building a mobile app from the same backend

The backend is a plain REST API and needs zero changes to work with a mobile app:

- **React Native / Expo (recommended)** — reuse `AuthContext`, `api/axios.js`
  (swap `localStorage` for `@react-native-async-storage/async-storage`), and
  each screen's logic; only the markup changes (`<View>` instead of `<div>`,
  NativeWind instead of Tailwind classes if you want near-identical styling).
- **Flutter / native** — more rewrite work, but the same API contract (the
  table above) still applies.

Point the mobile app at the same deployed backend URL from Step B.

---

## 8. Common errors & fixes

- **"MongoDB connection error"** → check `MONGO_URI`: no angle brackets left,
  password URL-encoded if it has special characters, Atlas Network Access
  allows `0.0.0.0/0`.
- **`vite: command not found`** → run `cd frontend && npm install` first.
- **CORS errors in the browser console** → `CLIENT_URL` (backend) must exactly
  match the frontend's real origin, no trailing slash.
- **401 errors after login** → `JWT_SECRET` changed between restarts while an
  old token was cached; log out and back in.
- **Vercel backend returns 404 on every route** → double-check `backend/vercel.json`
  exists and `api/index.js` is present; Vercel needs both.
- **Friend request never shows up for the other person** → they only see it
  under the 🔔 bell if they have a *real* account (signed up with that email) —
  placeholder/invited-only accounts auto-connect instead since there's no one
  to ask yet.
- **"Email is not configured" when signing up** → `EMAIL_USER`/`EMAIL_PASS`
  aren't set in `.env` (or in Vercel's environment variables) — see section 2.5.
- **Signup email never arrives** → check spam; confirm `EMAIL_USER`/`EMAIL_PASS`
  are correct (Gmail App Password, not your normal password); Gmail sometimes
  takes 10-20 seconds during a cold start on Vercel's free tier.
- **"Too many incorrect attempts" while entering the code** → request a fresh
  code with "Resend code" - each code allows 5 guesses before it's invalidated.

---

## 9. What you could add next (roadmap ideas)

- Real email delivery for invites/notifications (e.g. via SendGrid).
- Receipt/photo upload per expense (needs file storage, e.g. Cloudinary/S3).
- Live currency conversion for combining totals on request.
- Recurring expenses.
- Push notifications.

Tell me which of these — or anything else from the real Splitwise you want
mirrored — and I'll build it into this same codebase.
