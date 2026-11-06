# Room calendar (RoomBook)

Room calendar is the room booking and scheduling app for **Midwestern Career College**, running at **https://booking.it1dep.com**. It shows which classrooms are in use on every campus, lets schedulers book rooms without double-booking, loads the college's course schedule from a spreadsheet, and reports how much of the available room time is actually used.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, PostgreSQL and Prisma, and deployed as a Docker image on Coolify.

---

## Contents

1. [What the app does](#1-what-the-app-does)
2. [Roles and permissions](#2-roles-and-permissions)
3. [Schedule import / export](#3-schedule-import--export)
4. [Utilization report](#4-utilization-report)
5. [How the code is organized](#5-how-the-code-is-organized)
6. [Running it locally](#6-running-it-locally)
7. [Configuration](#7-configuration)
8. [Deploying (Coolify + GitHub image)](#8-deploying-coolify--github-image)
9. [Calendar invites](#9-calendar-invites)
10. [Known limitations](#10-known-limitations)

---

## 1. What the app does

### Pages

| Page | Who sees it | What it is for |
|---|---|---|
| **Sign in** (`/login`) | everyone | Email and password, or Okta single sign-on. |
| **Dashboard** (`/dashboard`) | everyone | Counts of campuses, rooms, bookings today and in the next 7 days; upcoming bookings; quick links. |
| **Bookings** (`/bookings`) | everyone | The room calendar, with four views (below), campus and room filters, and booking details. |
| **Rooms** (`/rooms`) | everyone | Rooms per campus with capacity, floor, building and amenities. Adding and editing needs the *rooms* permission. |
| **Reports** (`/reports`) | *reports* permission | Room utilization report with Excel export and Print / PDF. |
| **Campuses** (`/campuses`) | admins | Campus name, address, import code (`CampusID`), time zone and map position. Deleting a campus deactivates it so its booking history stays. |
| **Users** (`/admin/users`) | admins | Create accounts, set roles, reset passwords. |
| **Permissions** (`/admin/permissions`) | admins | Turn features on or off for schedulers and instructors. |
| **My profile** (`/profile`) | everyone | Change your name and password. |

### Calendar views (Bookings page)

The selected view is remembered in the browser.

- **Rooms by day** (default): one row per room, one column per day.
  - *Week* lists every class in each cell.
  - *Month* and *Custom* (any range up to about four months) show one small cell per room and day, filled when the room is booked. You can show all three parts of the day as stripes (Morning 7a–12p, Afternoon 12p–5p, Evening 5p–10p) or just one of them, and switch weekends on or off.
- **Room timeline**: one day, one row per room, time running left to right, free time shaded green.
- **Week**: a classic week calendar (FullCalendar).
- **List**: every booking as a card.

With **All campuses** selected, the two room views first show one row per campus; click a campus to open its rooms.

Bookings are **colored by program**. Imported bookings carry a TermID such as `BUSA2608CM1`; the letters in front (`BUSA`) are the program, and each program keeps the same color on every view and every week. The legend under the calendar counts bookings per program and lets you hide or show a program with one click.

### Bookings

- Admins and schedulers (by default) can create, edit and cancel bookings, including by clicking a free cell or free time in the room views.
- The server refuses a booking that overlaps another booking in the same room (`409 Room is already booked for this time`).
- Times are shown in each campus's own time zone (Central for Illinois, Eastern for Ohio).
- Instructors get a **read-only** calendar: they can look at every view and open bookings, but cannot change anything.

### Mobile

Every page works on a phone: the navigation collapses into a menu, the view switcher shows icons only, and wide tables scroll inside their card instead of stretching the page.

---

## 2. Roles and permissions

There are three roles (`prisma/schema.prisma`, `enum Role`):

| Role | Meaning |
|---|---|
| `ADMIN` | Can do everything, always. Also manages campuses, users and permissions. |
| `SCHEDULER` | Day-to-day scheduling staff. |
| `INSTRUCTOR` | Read-only by default. New Okta users start here. |

What schedulers and instructors may do is set by an admin on the **Permissions** page and stored in the `RolePermission` table. A missing row means the default from `src/lib/permissions.ts`:

| Feature | Key | Scheduler default | Instructor default |
|---|---|---|---|
| Create, edit and cancel bookings | `bookings.manage` | yes | no |
| Import and export schedules | `bookings.import` | yes | no |
| View reports | `reports` | yes | no |
| Add, edit and remove rooms | `rooms.manage` | no | no |

The API routes check the same permissions on the server (`src/lib/permissions-server.ts`), so hiding a button is never the only protection.

**Accounts.** A user signing in with Okta for the first time is created as `INSTRUCTOR`. Admins can also create email-and-password accounts on the Users page. The seed creates one admin:

- Email `admin@school.edu`, password `Admin1234!`

> [!CAUTION]
> Change this password right after the first sign-in on any server that others can reach.

---

## 3. Schedule import / export

Users with the *import* permission see an **Import / Export** button on the Bookings page. This is how the course schedule gets into the app; rooms that do not exist yet are created by the import.

**File layout** (CSV or `.xlsx`; the first sheet that has these headers is used):

| Column | Example | Used for |
|---|---|---|
| `SessionDate` | `10/13/2026` | Day of the class session |
| `CampusID` | `Chicago` | Campus code (see below) |
| `TermID` | `BUSA2608CM1` | Stored on the booking; its letters give the program color |
| `CourseID` | `ACCT100` | Booking title (`ACCT100 – Financial Accounting`) |
| `SectionID` | `2` | Stored on the booking |
| `CourseName` | `Financial Accounting` | Booking title |
| `SessionID` | `15` | Stored on the booking |
| `TimeSlots` | `Tu/Th 9:00a-12:00p` | Start and end time. The segment whose day matches `SessionDate` is used. |
| `RoomID` | `404` | Room name. Missing rooms are created under the campus. |

Rules:
- Rows whose `RoomID` contains `Online` or `Virtual` are skipped. Blank rooms and placeholders such as `Clinical Site` are skipped too.
- Times are read in the campus time zone.
- Each session is identified by `TermID + CourseID + SectionID + SessionID + SessionDate`, so uploading the same file again updates those bookings instead of duplicating them.
- The upload shows a preview first (counts, skipped rows, overlapping sessions) and saves nothing until you confirm.
- Export downloads the same columns as CSV or Excel, filtered by the selected campus and room.

**Campus codes** (from `prisma/campuses.ts`; created by the seed and, if missing, by the first import):

| CampusID | Campus | Address |
|---|---|---|
| `LaSalle` | Chicago Main Campus | 203 N LaSalle St #1400, Chicago, IL 60601 |
| `Chicago` | Chicago Downtown Campus | 100 S Wacker Dr LL1-50, Chicago, IL 60606 |
| `Naperville` | Naperville Campus | 200 E 5th Ave #128, Naperville, IL 60563 |
| `EvergreenPark` | Evergreen Park Campus | 9730 S Western Ave, Evergreen Park, IL 60805 |
| `Cleveland` | Cleveland Campus | 7261 Engle Rd, Middleburg Heights, OH 44130 |
| `Columbus` | Columbus Campus | 2780 Airport Dr, Columbus, OH 43219 |

The code and time zone can be changed on the Campuses page.

---

## 4. Utilization report

The **Reports** page answers "how much of our room time is actually used?" for one campus or all of them.

**Choose:** a period (up to a year), a campus or all campuses, which rooms, which weekdays, and which parts of the day (Morning, Afternoon, Evening by default; you can change their times or add more blocks).

**How it is counted** (`src/lib/utilization.ts`):

> Utilization = booked room-hours ÷ available room-hours, where *available* is every room in scope × every selected day × the selected time blocks.

Overlapping bookings in the same room count once, so a room never goes over 100%. Cancelled bookings are not counted. The report itself has a "How the numbers are counted" box, and a short note under each block, explaining every figure in plain language.

**What it shows:**
- Summary tiles: overall utilization, busiest block, slots with every room busy, rooms never used.
- When are the rooms busy (weekday × part of day heat map).
- Rooms, busiest first.
- By hour of day, and week by week.
- Who uses the rooms (by program).
- Campus comparison (when all campuses are selected).

**Output:**
- **Export Excel** downloads the full report as `.xlsx` from `/api/reports/utilization?format=xlsx`.
- **Print / PDF** uses the browser's print dialog. The print layout keeps the colors, keeps each block on one page where it fits, and prints every room (long room tables continue over several pages).

---

## 5. How the code is organized

```
prisma/
  schema.prisma        Database tables: User, Campus, Room, Booking, RolePermission (+ NextAuth tables)
  seed.ts              Creates the default admin and the campuses
  campuses.ts          The campus list (codes, addresses, time zones)
src/
  app/                 Next.js App Router: one folder per page
    bookings/ rooms/ reports/ campuses/ dashboard/ profile/ login/
    admin/users/ admin/permissions/
    api/               Route handlers (JSON API)
      bookings/          list, create, update, cancel; import/ and export/
      rooms/ campuses/ users/ permissions/ programs/
      reports/utilization/   report as JSON or xlsx
      invites/           send calendar invites for a booking
      health/            container health check
      auth/[...nextauth]/ sign-in (NextAuth)
  components/
    calendar/          RoomTimetable (Rooms by day), RoomAvailability (Room timeline),
                       BookingCalendar (Week), CampusOverview, ProgramLegend
    bookings/          Booking form, detail modal, Import / Export modal
    layout/ ui/ rooms/ campuses/ auth/ providers/
  lib/
    auth.ts            NextAuth setup (Okta + email/password, JWT sessions)
    permissions*.ts    Roles, features, defaults, server-side checks
    schedule*.ts       Reading and writing the schedule spreadsheet
    utilization.ts     Utilization report calculation
    time-blocks.ts     Morning / Afternoon / Evening blocks
    programs.ts        Program colors from TermID
    dates.ts           Calendar-date and time-zone helpers
    branding.ts        App name, college name and logo URLs
    graph.ts, ics.ts   Outlook (Graph) and .ics email invites
```

Main libraries: FullCalendar (week view), ExcelJS (CSV/XLSX import, export and report), NextAuth v4, Prisma 5, Headless UI and Heroicons, date-fns, Zod, react-hot-toast.

---

## 6. Running it locally

You need Node.js 20 and a PostgreSQL 16 database.

```bash
cp .env.example .env          # then set DATABASE_URL and NEXTAUTH_SECRET
npm install
npx prisma db push            # create the tables
npm run db:seed               # default admin + campuses
npm run dev                   # http://localhost:3000
```

Sign in with `admin@school.edu` / `Admin1234!`, then import a schedule file on the Bookings page to get rooms and bookings.

Or run the whole stack (PostgreSQL + the production build) with Docker:

```bash
cp .env.example .env
docker compose up --build
docker compose exec app sh scripts/init.sh   # first time only: tables + seed
```

The app container listens on port 3000 inside the Compose network (`expose`, not `ports`); add a `ports: ["3000:3000"]` entry if you want to reach it from your browser.

Other scripts: `npm run build`, `npm run lint`, `npm run db:studio` (Prisma Studio).

---

## 7. Configuration

All settings are environment variables (see `.env.example`).

| Variable | What it is | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | yes |
| `NEXTAUTH_SECRET` | Secret for signing sessions (`openssl rand -base64 32`) | yes |
| `NEXTAUTH_URL` | Public URL of the app, e.g. `https://booking.it1dep.com` | yes |
| `APP_URL` | Public URL, used in links | yes |
| `APP_NAME` | Name used in emails | no |
| `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_ISSUER` | Okta single sign-on | for Okta |
| `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` | Microsoft Graph (Outlook) invites | for Outlook invites |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | SMTP for `.ics` email invites | for email invites |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database container settings in Docker Compose | in Docker |
| `IMAGE_TAG` | Image version used by `docker-compose.ghcr.yml` (default `latest`) | no |

**Okta.** Create an *OIDC Web Application* in the Okta admin console with sign-in redirect `{APP_URL}/api/auth/callback/okta` and sign-out redirect `{APP_URL}/login`. Put its client ID and secret in `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` and the Okta domain (e.g. `https://school.okta.com`) in `OKTA_ISSUER`.

**Branding.** The app name ("Room calendar"), college name and logo URLs are in `src/lib/branding.ts`. The logos load from mccollege.edu; to bundle copies, put them under `public/brand/` and point the paths there.

---

## 8. Deploying (Coolify + GitHub image)

Production runs on Coolify with two containers: PostgreSQL 16 and the app.

**How the image is built.** `.github/workflows/docker-image.yml` runs on GitHub Actions:
- **Pull requests:** build only, to check the image still builds.
- **Pushes to `main`:** build and publish `ghcr.io/gagaren77/roombook:latest` and `:sha-<commit>`. If the repository secrets `COOLIFY_WEBHOOK_URL` and `COOLIFY_TOKEN` are set, it then calls Coolify's deploy webhook, so merging to `main` redeploys automatically.

**Which Compose file.**
- `docker-compose.ghcr.yml` pulls the prebuilt image, so a deploy takes seconds. This is the one to point Coolify at (*app → General → Build pipeline → Docker compose location* = `/docker-compose.ghcr.yml`). The `roombook` package on GitHub must be public, or the server needs `docker login ghcr.io` with a `read:packages` token.
- `docker-compose.yml` builds the image on the server from the `Dockerfile` (slower, no GitHub needed).

**On every start** the container runs `prisma db push`, so new, additive schema changes are applied automatically. `db push` refuses destructive changes (dropping columns or tables) without a flag, so those need a manual step.

**First deploy on an empty database:** open a terminal on the `app` container in Coolify and run `sh scripts/init.sh` (creates the tables and runs the seed). The seed is safe to run again.

**Rolling back:** set `IMAGE_TAG=sha-<commit>` in the app's environment variables and redeploy.

**Health check:** `GET /api/health`.

---

## 9. Calendar invites

The booking detail window has a **Send Invites** button (`src/app/api/invites/route.ts`), which tries both delivery methods:

- **`.ics` email** (`src/lib/ics.ts`): builds an iCalendar invite with `ical-generator` and emails it through SMTP with Nodemailer. Works with Outlook, Google and Apple calendars. Needs the `SMTP_*` variables.
- **Microsoft Graph** (`src/lib/graph.ts`): meant to create the event directly in Outlook. Needs the `AZURE_AD_*` variables and an Azure app registration with `Calendars.ReadWrite` application permission. See the limitation below.

---

## 10. Known limitations

- **Outlook (Graph) invites are not finished.** `src/lib/graph.ts` still uses a placeholder token instead of a real MSAL sign-in, so Graph calls fail even with the `AZURE_AD_*` variables set. Use the `.ics` email method.
- Recurring bookings are not supported in the booking form; repeating classes come in through the schedule import, one booking per session.

---

## License

Proprietary. Internal software for Midwestern Career College. All rights reserved.
