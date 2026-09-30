# School Room & Resource Booking System

An enterprise-ready room and resource scheduling web application designed for multi-campus academic institutions. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, PostgreSQL, and Prisma ORM. Supports single sign-on (SSO) via Okta, local credential authentication, automated calendar invites via Microsoft Graph API with fallback to iCalendar (.ics) email delivery, and multi-campus resource management.

---

## Table of Contents
1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Environment Setup](#4-environment-setup)
   - [Environment Variables Reference](#environment-variables-reference)
   - [Okta SSO Configuration](#okta-sso-configuration)
   - [Azure AD Configuration (Microsoft Graph API)](#azure-ad-configuration-microsoft-graph-api)
   - [Database Setup (Coolify / Managed PostgreSQL)](#database-setup-coolify--managed-postgresql)
5. [Coolify Deployment](#5-coolify-deployment)
6. [Local Development](#6-local-development)
   - [Bare Metal (Node.js & Local PostgreSQL)](#bare-metal-nodejs--local-postgresql)
   - [Docker Compose (Local Development)](#docker-compose-local-development)
7. [Default Admin Account](#7-default-admin-account)
8. [User Roles Explanation](#8-user-roles-explanation)
9. [Sending Invites (Graph API vs. ICS Fallback)](#9-sending-invites-graph-api-vs-ics-fallback)
10. [Adding Campuses and Rooms](#10-adding-campuses-and-rooms)

---

## 1. Overview

The **School Room & Resource Booking System** streamlines room scheduling, resource tracking, and conflict-free booking across educational facilities. Designed specifically for colleges with multiple campuses, departments, and diverse room types (classrooms, computer labs, conference rooms, lecture halls).

### Key Features
- **Multi-Campus Support**: Organize campuses, buildings, and rooms by geographic location with address and contact details.
- **Interactive Calendar Views**: Rich calendar interfaces (DayGrid, TimeGrid, Resource Timeline, Agenda List) powered by FullCalendar.
- **Conflict Prevention**: Built-in validation ensuring rooms cannot be double-booked for overlapping time ranges.
- **Dual Authentication**:
  - **Okta OIDC / SSO**: Enterprise institutional login with automated user provisioning.
  - **Credentials Provider**: Fallback email and password authentication with bcrypt hashing.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for `ADMIN`, `SCHEDULER`, and `INSTRUCTOR`.
- **Automated Calendar Invites**:
  - **Microsoft Graph API**: Direct synchronization with Microsoft 365 / Outlook calendars.
  - **ICS Email Invites**: RFC 5545 `.ics` calendar invite attachments delivered via SMTP for universal calendar client compatibility.
- **Room Amenities & Capacity Management**: Track capacities and equipment (Projectors, Smartboards, Computers, Whiteboards, Video Conferencing).
- **Health Monitoring**: Dedicated container health endpoint at `/api/health`.

---

## 2. Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components, Route Handlers)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Frontend & Styling**: [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Headless UI](https://headlessui.com/), [Heroicons](https://heroicons.com/)
- **Calendar & Scheduling**: [FullCalendar](https://fullcalendar.io/) (Core, DayGrid, TimeGrid, Resource TimeGrid, Scheduler)
- **Database & ORM**: [PostgreSQL 16](https://www.postgresql.org/), [Prisma ORM 5](https://www.prisma.io/)
- **Authentication**: [NextAuth.js v4](https://next-auth.js.org/) (Okta Provider + Credentials Provider)
- **External Integrations**:
  - [Microsoft Graph Client](https://github.com/microsoftgraph/msgraph-sdk-javascript) (`@microsoft/microsoft-graph-client`)
  - [Nodemailer](https://nodemailer.com/) (SMTP transport)
  - [ical-generator](https://github.com/sebbo2002/ical-generator) (iCalendar standard RFC 5545 generator)
- **Containerization & Deployment**: Docker (Multi-stage alpine build), Docker Compose, [Coolify](https://coolify.io/)

---

## 3. Prerequisites

Before running or deploying the application, ensure you have:

- **Docker & Docker Compose**: Docker Engine 24+ and Docker Compose v2.
- **Node.js & npm** (for local development without Docker): Node.js 20 LTS and npm 10+.
- **PostgreSQL**: PostgreSQL 16 database instance (local or hosted).
- **Okta Admin Account** (optional for local testing, required for production SSO).
- **Microsoft Entra ID / Azure AD Tenant** (optional, for native Outlook calendar sync).
- **SMTP Server**: Office 365, SendGrid, Amazon SES, or standard SMTP server for email notifications.

---

## 4. Environment Setup

Copy `.env.example` to create your working `.env` file:
```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Description | Example / Default | Required |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@localhost:5432/school_booking` | Yes |
| `POSTGRES_DB` | Docker Postgres database name | `school_booking` | In Docker |
| `POSTGRES_USER` | Docker Postgres user | `postgres` | In Docker |
| `POSTGRES_PASSWORD` | Docker Postgres password | `postgres` (use strong password in prod) | In Docker |
| `NEXTAUTH_SECRET` | 32-byte base64 secret for JWT encryption | Generate with `openssl rand -base64 32` | Yes |
| `NEXTAUTH_URL` | Canonical URL of the web application | `http://localhost:3000` or `https://booking.school.edu` | Yes |
| `OKTA_CLIENT_ID` | Okta OIDC Application Client ID | `0oa...` | For Okta SSO |
| `OKTA_CLIENT_SECRET` | Okta OIDC Application Client Secret | `secret...` | For Okta SSO |
| `OKTA_ISSUER` | Okta Authorization Server URL | `https://your-org.okta.com` | For Okta SSO |
| `AZURE_AD_CLIENT_ID` | Azure AD App Registration (Client) ID | `00000000-0000-0000-0000-000000000000` | For Graph API |
| `AZURE_AD_CLIENT_SECRET`| Azure AD App Registration Client Secret | `~secret...` | For Graph API |
| `AZURE_AD_TENANT_ID` | Azure AD Directory (Tenant) ID | `00000000-0000-0000-0000-000000000000` | For Graph API |
| `SMTP_HOST` | SMTP server hostname | `smtp.office365.com` | For ICS Invites |
| `SMTP_PORT` | SMTP port (`587` for STARTTLS, `465` for SSL) | `587` | For ICS Invites |
| `SMTP_USER` | SMTP authentication user / email | `noreply@your-school.edu` | For ICS Invites |
| `SMTP_PASSWORD` | SMTP password or App Password | `app-password` | For ICS Invites |
| `SMTP_FROM` | Sender display name and email address | `School Booking System <noreply@your-school.edu>`| For ICS Invites |
| `APP_NAME` | Institutional application title | `School Room Booking` | No |
| `APP_URL` | Public application root URL | `http://localhost:3000` | Yes |

---

### Okta SSO Configuration

Follow these steps in the Okta Admin Console:

1. **Open Applications**: Log in to `https://<your-org>-admin.okta.com` and go to **Applications** → **Applications**.
2. **Create App Integration**:
   - Click **Create App Integration**.
   - Select **OIDC - OpenID Connect** as the Sign-in method.
   - Select **Web Application** as the Application type.
   - Click **Next**.
3. **Configure Settings**:
   - **App integration name**: `School Room Booking`
   - **Grant type**: Check `Authorization Code` and `Refresh Token`.
   - **Sign-in redirect URIs**:
     ```
     {APP_URL}/api/auth/callback/okta
     ```
     *(e.g., `http://localhost:3000/api/auth/callback/okta` for local dev or `https://booking.school.edu/api/auth/callback/okta` for production)*
   - **Sign-out redirect URIs**:
     ```
     {APP_URL}/login
     ```
   - **Controlled access**: Select **Allow everyone in your organization to access** or choose specific groups.
4. **Copy Credentials**:
   - Save the app.
   - Copy **Client ID** → `OKTA_CLIENT_ID`
   - Copy **Client secret** → `OKTA_CLIENT_SECRET`
   - Copy the **Okta domain** (e.g., `https://dev-123456.okta.com` or `https://school.okta.com`) → `OKTA_ISSUER`

---

### Azure AD Configuration (Microsoft Graph API)

To enable direct synchronization with Microsoft 365 / Outlook calendars:

1. **Access Microsoft Entra ID**: Go to [Microsoft Entra admin center](https://entra.microsoft.com) or [Azure Portal](https://portal.azure.com).
2. **Register an Application**:
   - Navigate to **Identity** → **Applications** → **App registrations** → **New registration**.
   - **Name**: `School Room Booking System`
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI (optional)**: Web: `{APP_URL}/api/auth/callback`
   - Click **Register**.
3. **Record IDs**:
   - Copy **Application (client) ID** → `AZURE_AD_CLIENT_ID`
   - Copy **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`
4. **Create Client Secret**:
   - Go to **Certificates & secrets** → **Client secrets** → **New client secret**.
   - Add a description (e.g. `Booking App Production`) and set an expiration period.
   - Click **Add** and immediately copy the **Value** → `AZURE_AD_CLIENT_SECRET`.
5. **Grant API Permissions**:
   - Go to **API permissions** → **Add a permission** → **Microsoft Graph**.
   - Select **Application permissions**:
     - `Calendars.ReadWrite` (Allows the app to create, update, and delete calendar events)
     - `Mail.Send` (Allows the app to send meeting notifications directly through Exchange)
   - Click **Add permissions**.
   - Click **Grant admin consent for <Your Organization>** and confirm.

---

### Database Setup (Coolify / Managed PostgreSQL)

If deploying via Coolify:
1. In the Coolify Dashboard, navigate to your Project and target Environment.
2. Click **+ New Resource** → **Database** → **PostgreSQL**.
3. Name your database service (e.g., `booking-postgres`).
4. Set:
   - Database Name: `school_booking`
   - User: `postgres` (or custom username)
   - Password: `<a-secure-password>`
5. Coolify will generate an internal connection URL:
   ```
   postgresql://postgres:<password>@<service-id>:5432/school_booking
   ```
   Use this URL as the value for `DATABASE_URL` in your application resource settings.

---

## 5. Coolify Deployment

Coolify makes deploying and managing Dockerized applications straightforward:

### Step 1: Create a Project
1. In the Coolify Dashboard, click **Projects** → select or create a Project (e.g., `Academic Operations`).
2. Select the target environment (e.g., `Production`).

### Step 2: Provision PostgreSQL
1. Click **+ New Resource** → **Database** → **PostgreSQL**.
2. Set the database name to `school_booking`.
3. Note the internal connection hostname and credentials.

### Step 3: Add Application as Docker Compose
1. Click **+ New Resource** → **Source** (GitHub / Gitlab / Git Repository).
2. Select your Git repository containing the booking app code.
3. In the **Build Pack** selection, choose **Docker Compose**.
4. Set the Compose file path to `docker-compose.yml`.

### Step 4: Configure Environment Variables
In the application's **Environment Variables** tab in Coolify, add all necessary variables:
```dotenv
DATABASE_URL=postgresql://postgres:<password>@<internal-postgres-host>:5432/school_booking
NEXTAUTH_SECRET=your-random-32-byte-secret
NEXTAUTH_URL=https://booking.school.edu
APP_URL=https://booking.school.edu
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_ISSUER=https://school.okta.com
AZURE_AD_CLIENT_ID=your-azure-ad-client-id
AZURE_AD_CLIENT_SECRET=your-azure-ad-client-secret
AZURE_AD_TENANT_ID=your-azure-ad-tenant-id
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@school.edu
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=School Booking System <noreply@school.edu>
```

### Step 5: Deploy the Stack
Click **Deploy** in the top right corner. Coolify will build the multi-stage Docker image and start the containers.

### Step 6: Run Database Initialization
Once the containers are running, run the database migrations and seed script:
1. In the Coolify dashboard, select the `app` container and open the **Terminal / Execute Command** tab.
2. Run the initialization script:
   ```bash
   sh scripts/init.sh
   ```
   *Alternatively, run from your server CLI:*
   ```bash
   docker compose exec app sh scripts/init.sh
   ```

---

## 6. Local Development

### Bare Metal (Node.js & Local PostgreSQL)

1. **Clone and enter repository**:
   ```bash
   cd booking-app
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL credentials
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Sync Prisma schema**:
   ```bash
   npx prisma db push
   ```

5. **Seed the database**:
   ```bash
   npm run db:seed
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Docker Compose (Local Development)

To run the complete stack (PostgreSQL + Next.js with hot-reloading) inside Docker:

```bash
# 1. Ensure .env exists
cp .env.example .env

# 2. Start PostgreSQL and development app
docker compose up --build
```

`docker-compose.override.yml` is automatically applied:
- Mounts source code into the container for live editing.
- Runs `npm run dev` with Next.js fast-refresh.
- Exposes PostgreSQL on port `5432` and the app on port `3000`.

To seed the database inside the running container:
```bash
docker compose exec app npx prisma db push
docker compose exec app npm run db:seed
```

---

## 7. Default Admin Account

During database seeding (`npm run db:seed`), a default system administrator account is created:

- **Email**: `admin@school.edu`
- **Password**: `Admin1234!`
- **Role**: `ADMIN`

> [!CAUTION]
> **Security Notice**: Immediately log in and change this password in production or when exposing the application to public networks!

---

## 8. User Roles Explanation

The application enforces Role-Based Access Control (RBAC) defined in the Prisma schema:

| Role | Permissions & Capabilities |
|---|---|
| `ADMIN` | **Full Platform Authority**: Can create, edit, and deactivate campuses, buildings, and rooms; view and edit all bookings across all campuses; manage user accounts and assign user roles (`ADMIN`, `SCHEDULER`, `INSTRUCTOR`); configure system-wide integrations. |
| `SCHEDULER` | **Campus-Wide Scheduling Authority**: Can view availability across all campuses; create, modify, or cancel bookings on behalf of any instructor or department; resolve scheduling conflicts; dispatch calendar invitations and reminders. Cannot alter campus structures or manage user credentials. |
| `INSTRUCTOR` | **Faculty & Staff Access**: Can browse room availability across campuses; create bookings for assigned classes, exams, or meetings; manage, reschedule, and cancel their own bookings; invite attendees. Cannot modify bookings created by others or access administrative configuration. |

**Provisioning Flow**:
When a user logs in via Okta SSO for the first time, an account is automatically created in the database with the default role `INSTRUCTOR`. An `ADMIN` can subsequently elevate the user's role to `SCHEDULER` or `ADMIN`.

---

## 9. Sending Invites (Graph API vs. ICS Fallback)

The application features a hybrid calendar delivery system implemented in `src/app/api/invites/route.ts`:

```
                       ┌─────────────────────────┐
                       │  Booking Created / Updated │
                       └────────────┬────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   Method: "graph" (or "both")               Method: "ics" (or "both")
┌───────────────────────────────┐         ┌───────────────────────────────┐
│     Microsoft Graph API       │         │      SMTP & iCalendar         │
│     (src/lib/graph.ts)        │         │      (src/lib/ics.ts)         │
├───────────────────────────────┤         ├───────────────────────────────┤
│ • Connects to Microsoft 365   │         │ • Generates standard .ics     │
│ • Direct Outlook calendar sync│         │ • Compatible with all clients │
│ • Native RSVP & Teams events  │         │   (Google, Apple, Outlook)    │
│ • Automatic event updates     │         │ • Transmitted via Nodemailer  │
└───────────────────────────────┘         └───────────────────────────────┘
```

1. **Microsoft Graph API (`graph`)**:
   - Native integration with Microsoft 365 Exchange Online.
   - Creates real calendar events directly on the organizer's and attendees' Outlook calendars.
   - Handles real-time synchronization, meeting updates, and event cancellations (`cancelOutlookEvent`).
   - Requires valid `AZURE_AD_*` credentials.

2. **iCalendar / SMTP Fallback (`ics`)**:
   - Generates an RFC 5545-compliant `.ics` iCalendar payload via `ical-generator`.
   - Dispatches a MIME multipart email with `method=REQUEST` attachment via Nodemailer over SMTP.
   - Ensures calendar invitations work seamlessly for external attendees using Google Calendar, Apple Calendar, Thunderbird, or mobile mail clients.

3. **Dual Dispatch (`both`)**:
   - Dispatches both a native Graph calendar booking and a backup ICS email invite to maximize attendee reach and cross-platform compatibility.

---

## 10. Adding Campuses and Rooms

### Via Administrative Web Interface
1. Sign in with an account having the `ADMIN` role.
2. Navigate to **Campuses** in the navigation bar.
3. Click **Add Campus**:
   - Provide Campus Name (e.g., `Downtown Learning Center`), Address, City, State, ZIP, and Phone.
4. Click into the newly created Campus and click **Add Room**:
   - Enter Room Name / Number (e.g., `Room 302 - Biology Lab`).
   - Specify Capacity (e.g., `35`).
   - Specify Floor and Building.
   - Select Amenities from the checklist (`Projector`, `Smartboard`, `Computers`, `Whiteboard`, `Video Conferencing`).
5. Save the room. The room is now immediately available in the booking calendar.

### Programmatic Seeding (`prisma/seed.ts`)
To configure default campuses and rooms across deployments, update `prisma/seed.ts`:

```typescript
const campus = await prisma.campus.create({
  data: {
    name: 'South Campus',
    address: 'Chicago, IL, 60637',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60637',
  },
});

await prisma.room.createMany({
  data: [
    {
      name: 'Classroom 101',
      capacity: 35,
      description: 'Lecture classroom with smartboard',
      amenities: ['Projector', 'Whiteboard', 'Smartboard'],
      campusId: campus.id,
    },
    {
      name: 'Computer Lab 2',
      capacity: 25,
      description: 'High-performance PC workstation lab',
      amenities: ['Computers', 'Projector'],
      campusId: campus.id,
    },
  ],
});
```
Then execute:
```bash
npm run db:seed
```

---

## License
Proprietary — Internal educational software for Midwestern Career College. All rights reserved.
