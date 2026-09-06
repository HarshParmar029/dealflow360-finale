# DealFlow360

### An Intelligent, Self-Governing Sales Operations Platform

**Odoo Hackathon 2026 — Grand Finale Submission**

**[Watch the full demo video here] https://drive.google.com/file/d/1TycFhZC68ntNeRtuCnAGdWhSHmC7CbHm/view?usp=sharing** — 
see the entire flow live: automatic approval routing, customer negotiation with auto re-approval, warehouse split, and the Deal Health Dashboard, all in one walkthrough.

---

## Overview

DealFlow360 is a B2B sales operations platform that goes beyond the standard quote-to-invoice flow. Instead of relying on reps to manually request approvals or customers to negotiate over email, the system enforces pricing discipline and re-evaluates risk automatically — every time a discount is applied, on either side of the deal.

Most sales tools treat approval as a manual checkpoint. DealFlow360 treats it as a computed outcome of real business rules: category-specific discount ceilings, a blended risk score across every line in an order, and automatic re-routing whenever those rules are crossed — whether by a rep or by the customer themselves.

## The Problem

Real B2B sales teams don't operate in clean, single-discount scenarios. They deal with:

- Multiple product categories with different acceptable discount ranges on the same order
- Reps who can technically stay "within limits" on every line while still giving away far more margin than intended, once you look at the order as a whole
- Customers who want to negotiate directly rather than trade emails back and forth
- Managers who only discover a deal is stuck or over-discounted after the fact

DealFlow360 is built to close these gaps with actual application logic — not hardcoded status flags.

## Key Features

**Blended Discount Risk Score (Core Engine)**
Every product category has its own discount ceiling. When a quotation is created or renegotiated, each line is checked against its category limit, and any excess is summed into a single blended risk score for the whole order. A single well-hidden violation, or several small ones spread across multiple lines, both surface the same way — nothing slips through by staying "technically" compliant line by line.

**Automatic Approval Routing**
A quotation is approved instantly if its blended risk score is zero. If not, it is routed to manager review without any manual "request approval" step. The system decides — the rep never does.

**Customer Negotiation Portal**
Customers get a separate, restricted portal to view their quotation and submit a counter-discount directly — no email thread required. Every counter-offer re-runs the same blended risk score calculation. If the customer's request breaks the limits, the quotation automatically re-enters the manager approval flow, exactly as if a rep had over-discounted it.

**Live Upsell & Margin Intelligence**
While building a quote, reps see contextual upsell suggestions tied to the product they've selected, along with the margin impact — plus a live running margin percentage on the cart itself.

**Deal Health Dashboard**
A real-time view of the pipeline: total deals, pending approvals, high-risk quotations, and stalled deals that haven't moved in over a set number of days — each one click-through to the underlying quotation.

**Warehouse Suggested Split**
Once a quotation is approved, the system checks live stock levels across warehouses and suggests how the order should be fulfilled — splitting across locations automatically when a single warehouse can't cover the full quantity, and flagging any shortfall as backorder.

**Hybrid Billing View**
One-time products and recurring subscription lines on the same order are shown separately, with recurring lines clearly marked with their monthly billing amount.

**Role-Based Access Control**
Four distinct roles — Sales Rep, Manager, Customer, Admin — each with their own restricted views and permissions, enforced at the API level, not just hidden in the UI. Customers cannot access another customer's quotation under any circumstance.

**Full Audit Trail**
Every approval, rejection, and negotiation comment is logged against the quotation with the acting user and timestamp.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database | PostgreSQL (hosted on Neon) |
| ORM | Prisma |
| Authentication | NextAuth (Credentials Provider) + bcrypt password hashing |
| Validation | Zod + React Hook Form |
| Styling | Tailwind CSS |

## Architecture Overview

```
Frontend (Next.js pages)
   Rep workspace · Create quotation · Approvals · Customer portal · Dashboard
        |
        v   fetch calls
Backend (Next.js API routes / Node.js)
   Auth · Quotations · Approve · Negotiate · Confirm · Upsell · Warehouse-split
        |
        v   Prisma ORM queries
Database (PostgreSQL on Neon)
   User · Customer · Product · Quotation · ApprovalLog · Warehouse · ...
```

The frontend never talks to the database directly — every read or write passes through an API route that enforces authentication, role checks, and the business rules described above. The blended risk score logic lives in a single shared module and is used identically whether a quotation is created by a rep or renegotiated by a customer, so the same rules apply no matter who is discounting.

## How to Run

```bash
# 1. Clone the repository
git clone https://github.com/HarshParmar029/dealflow360-finale.git
cd dealflow360-finale

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file with your PostgreSQL connection string:
# DATABASE_URL="your-neon-postgres-url"

# 4. Push the schema and seed the database
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# 5. Run the development server
npm run dev
```

Then open `http://localhost:3000/login` in your browser.

## Demo Credentials

All accounts use the password: `password123`

| Role | Email | Access |
|---|---|---|
| Admin | admin@dealflow360.com | Full backend visibility |
| Manager | manager@dealflow360.com | Approvals, dashboard |
| Sales Rep | rep1@dealflow360.com | Workspace, create quotations |
| Customer (Gold) | gold@dealflow360.com | Customer portal only |
| Customer (Silver) | silver@dealflow360.com | Customer portal only |
| Customer (Bronze) | bronze@dealflow360.com | Customer portal only |

New Sales Rep and Customer accounts can also be created through the signup page.

## Core Demo Flow

This is the sequence that best demonstrates the business logic end to end:

1. **Sign in as a Sales Rep** and create a new quotation. Add a line item and apply a discount above its category's limit (for example, 18% on a Service item with a 10% ceiling).
2. **Submit the quotation.** Its status automatically becomes `PENDING_MANAGER` with a calculated risk score — no manual approval request was made.
3. **Sign in as the Manager**, open Approvals, review the risk score, and approve the quotation.
4. **Sign in as the Customer**, open the portal, and submit a counter-discount that again exceeds the category limit.
5. **Watch the quotation automatically re-enter `PENDING_MANAGER`** — the customer negotiated directly, and the system re-applied the same business rule without any rep involvement.
6. **Sign back in as the Manager** and approve the renegotiated quotation.
7. **Sign in as the Customer** and confirm the quotation.
8. **Open the quotation detail view** to see the suggested warehouse fulfillment split and the separation between one-time and recurring line items.
9. **Check the Deal Health Dashboard** for a live view of pending, high-risk, and stalled deals across the pipeline.

## What I Would Build Next

With more time, the next priorities would be:

- **Second-tier finance approval** — extending the current single-level manager approval into a full chain, where quotations above a higher risk threshold require manager approval followed by finance sign-off, as outlined in the original approval-chain design.
- **Warehouse and stock management UI** — an admin-facing screen to create warehouses and adjust stock levels directly, rather than through seed data.
- **Reporting dashboard with filters** — period, sales rep, approval status, and product/category filters, with PDF/XLS export.
- **Subscription proration logic** — automatic proration calculations when a recurring line's quantity changes mid-cycle, along with cancellation and partial refund handling.
- **Multi-currency support** — for organizations operating across regions.

---

Built solo in 24 hours for Odoo Hackathon 2026 — Grand Finale.
