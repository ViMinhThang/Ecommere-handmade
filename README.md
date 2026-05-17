# E-commerce Handmade Platform

A full-stack, modern E-commerce platform designed for handmade products. Built with a powerful NestJS backend and a high-performance Next.js frontend, this project is managed using the **Antigravity Kit** AI Agent framework.

## 🏗️ Architecture

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TanStack Query, Shadcn UI.
- **Backend:** NestJS 11, Prisma ORM, PostgreSQL, JWT Authentication.
- **Payments:** Stripe SDK & `@stripe/react-stripe-js` (Synchronous Intent Flow).
- **AI Infrastructure:** Antigravity Kit (20 specialist agents, 36 skills).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js:** v18 or higher
- **PostgreSQL:** Running instance
- **npm** or **yarn**

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Configure environment variables:
```bash
cp .env.example .env
```
Required backend variables in `backend/.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PLATFORM_COMMISSION_BPS`

Initialize the database and run the seeder:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

Start the backend server:
```bash
npm run start:dev
```
The API will be available at `http://localhost:3001`.

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd ../frontend
npm install
```

Configure environment variables:
```bash
cp .env.example .env
```

Required frontend variables in `frontend/.env`:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. 

### Environment Security
- Never commit real `.env` files.
- Keep only template files (`.env.example`) in Git.
- If any secret has been committed before, rotate it immediately.

Secret groups that must be rotated if previously exposed:
- Database credentials
- JWT signing secret
- SMTP credentials
- Stripe API secrets (including webhook signing secret)
- OAuth client identifiers/secrets (Google, eBay)

---

## Local Admin Seed
- The seed script does not read admin credentials from env files.
- In non-production environments, it creates or updates the local admin account directly in the database.
- The seed keeps `admin@ecommerce.com` active, verified, and assigned `ROLE_ADMIN`.
- In production environments, admin seeding is skipped by default.

---

## ✨ Features & Architecture Highlights

### 🎨 The Artisanal "Discovery" Experience
The platform features a highly curated, fully Vietnamese-localized `Discovery` component designed around a premium "paper engineer" aesthetic. It emphasizes vibrant photography, a sharp 0-radius micro-layout (`--radius: 0rem`), and a bespoke commission flow intended to bridge the digital experience with physical craftsmanship.

### 💳 Stripe & Multi-Seller Architecture
Operating under a "Master/Sub" order paradigm, a unified Shopping Cart handles checkout using **Stripe Elements** (`PaymentIntent`). 
Upon checkout:
1. Inventory logic prevents overselling by safely deducting stock immediately upon checkout initiation.
2. The transaction branches into multi-vendor `SubOrder` records—keeping platform metrics cohesive while enabling easy payouts for individual sellers.
3. The platform uses a highly secure, webhook-free **Synchronous Polling Gateway**, performing direct backend-to-backend queries to Stripe to verify successful intents before sealing the order state to `PAID`.

---

## 🤖 AI Agent Framework (Antigravity Kit)

This repository includes a sophisticated AI governance layer in the `.agents/` directory.

### Key Commands
- **Check Project Status:** `python .agent/scripts/checklist.py .`
- **Full Verification:** `python .agent/scripts/verify_all.py .`

### Available Agents
- `@orchestrator`: Multi-agent coordination.
- `@frontend-specialist`: UI/UX and React performance.
- `@backend-specialist`: API and business logic.
- `@database-architect`: Prisma and Schema optimization.
- ...and 16 others.

---

## 📂 Project Structure
```plaintext
├── .agents/          # AI Agent personas and specialized skills
├── backend/          # NestJS server and Prisma schema
├── frontend/         # Next.js application
└── design/           # UI/UX reference assets
```

## 🛠️ Tech Stack Highlights
- **Backend:** NestJS 11, Prisma 5.22, Passport JWT, Swagger.
- **Frontend:** Next.js 16, Lucide Icons, Recharts, Tiptap, Sonner.
- **Testing:** Jest, Playwright (E2E).

