# RestroERP - Enterprise Restaurant Management SaaS

Powered by **Lincoz Tech**.

## 🚀 Deployment Instructions

This project is built with **Next.js**, **Prisma**, and **Tailwind CSS**. It is designed to be deployed on any VPS (Ubuntu/Windows) or Cloud Platform (Vercel/Railway).

### 1. Environment Setup
Create a `.env` file in the root directory:
```env
# For Production (Vercel/Railway): Use PostgreSQL
DATABASE_URL="postgresql://user:password@host:port/dbname"

# For Local (Optional): You can still use SQLite by changing provider in schema.prisma
# DATABASE_URL="file:./dev.db"

JWT_SECRET="your-secret-key"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Migration
```bash
npx prisma migrate dev --name init
# For production:
# npx prisma migrate deploy
```

### 4. Build & Start
```bash
npm run build
npm run start
```

## 📂 Project Structure
- `/src/app`: Next.js App Router (UI & API)
- `/src/components`: Reusable UI components
- `/prisma`: Database schema and migrations
- `/public`: Static assets (Logos, Icons)

## 🔐 Roles
- **OWNER**: Full access to everything.
- **MANAGER**: Can manage menu, staff (HR), tables, and billing.
- **CASHIER**: Focuses on POS, Delivery assignment, and Settlement.
- **RIDER**: Mobile-friendly view for assigned deliveries.
- **ACCOUNTANT**: Access to Finance reports.

---
© 2026 Lincoz Tech. All rights reserved.
