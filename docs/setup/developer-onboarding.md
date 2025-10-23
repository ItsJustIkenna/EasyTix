# EasyTix Developer Onboarding Guide

**Welcome to the EasyTix team!**

This guide will walk you through the documentation package and help you understand what to read first.

---

## Your Mission

Build a working ticketing platform MVP in **30 days**. Beta customers are waiting.

**What you're building:**
- Digital ticketing platform for local/semi-pro sports events
- Instant ticket delivery via SMS/email
- QR code validation at entry
- Organizer dashboard with real-time analytics
- Admin platform for oversight and configuration

---

## Documentation Package (4 Documents)

You've received 4 documents. **Read them in this order:**

### 1. Mission & Vision Document (30 minutes)
**Read this first.** Explains:
- Why we're building EasyTix
- Our target customers (small event organizers)
- Core business model (10% platform fee max)
- Product philosophy (simplicity, transparency, speed)
- How to make decisions when requirements are unclear

**Key Takeaway:** When uncertain, ask "Does this serve the 90% use case?" and "Would Sarah (yoga studio owner) use this?"

---

### 2. Complete Database Schema (45 minutes)
**Read this second.** Defines:
- 11 PostgreSQL tables with relationships
- Complete Prisma schema (copy/paste ready)
- Business logic embedded in data model
- Critical tables: PlatformConfig, EventPricingOverride, Admin, AuditLog

**Key Takeaway:** Dynamic pricing and audit logging are built into the data model, not afterthoughts.

**Action Item:** Set up your local database and run the initial migration.

---

### 3. Complete API Specification (2 hours)
**Read this third.** Specifies:
- 15 REST endpoints with full examples
- Request/response JSON formats
- Authentication & authorization logic
- Error handling and validation rules
- Stripe integration details
- Webhook handling

**Key Takeaway:** This is your implementation contract. Every endpoint has complete specifications.

**Action Item:** Decide which endpoints to build first (recommendation: Auth → Events → Checkout).

---

### 4. Functional/Technical Design Doc (Reference Only)
**Use as reference, don't read cover-to-cover.** Contains:
- Complete UI component inventory
- File structure of existing V0 prototypes
- What's already built (frontend) vs. what's missing (backend)

**Key Takeaway:** The UI exists as prototypes. Your job is to make it functional with real data.

**When to reference:**
- Understanding URL structure (`/events`, `/checkout`, etc.)
- Seeing what forms/fields exist in the UI
- Checking which shadcn/ui components are available

**What to ignore:**
- The database schema section (outdated - use Document 2 instead)
- The API endpoint list (incomplete - use Document 3 instead)

---

## Quick Start Checklist

### Day 1: Setup & Context
- [ ] Read Mission & Vision document
- [ ] Set up development environment (Node.js 18+, PostgreSQL)
- [ ] Clone project repository
- [ ] Install dependencies (`npm install`)

### Day 2: Database
- [ ] Read Complete Database Schema document
- [ ] Choose database provider (Supabase/Neon/local PostgreSQL)
- [ ] Set up Prisma (`npx prisma init`)
- [ ] Copy schema from Document 2 to `prisma/schema.prisma`
- [ ] Run first migration (`npx prisma migrate dev --name init`)
- [ ] Seed initial data (platform config, admin user)

### Day 3: Authentication
- [ ] Read API Specification (Auth section)
- [ ] Choose auth solution (NextAuth.js recommended)
- [ ] Implement `/api/auth/register` endpoint
- [ ] Implement `/api/auth/login` endpoint
- [ ] Test auth flow with Postman/Thunder Client

### Day 4-5: Core Features
- [ ] Implement event creation endpoint
- [ ] Implement event listing with pagination
- [ ] Connect to existing V0 UI to verify data flow

---

## Architecture Overview

### Tech Stack (Already Decided)
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **UI Components:** shadcn/ui (already installed)
- **Database:** PostgreSQL (your choice of provider)
- **ORM:** Prisma (schema provided)
- **Payments:** Stripe (Connect for organizer payouts)
- **SMS:** Twilio
- **Email:** Resend or SendGrid
- **Hosting:** Vercel (recommended)

### What's Already Built
- ✅ All frontend UI (18 pages)
- ✅ Navigation structure
- ✅ Forms (need backend connection)
- ✅ Admin dashboard layout
- ✅ Design system and components

### What You're Building
- ⚠️ Database and data models
- ⚠️ Authentication system
- ⚠️ All API endpoints
- ⚠️ Payment processing (Stripe)
- ⚠️ Ticket generation (QR codes)
- ⚠️ Email/SMS delivery
- ⚠️ Ticket validation logic
- ⚠️ Payout automation
- ⚠️ Admin audit logging

---

## Critical Business Rules

These are non-negotiable. If you're unsure about anything else, these rules must be followed:

### 1. Pricing (10% Cap)
**Total platform fee must NEVER exceed 10% of organizer's base ticket price.**

Example:
- Organizer sets ticket price: $50.00
- We can charge buyers up to: $55.00 ($5.00 = 10% of $50)
- Organizer receives: $50.00 (exactly what they set)
- We keep: $5.00 maximum

**Implementation:**
- Fetch active `PlatformConfig` when creating ticket tiers
- Calculate fees dynamically (not hardcoded)
- Store calculated values in ticket tier for audit trail
- See API Specification → Ticket Tier Creation for formula

### 2. Atomic Transactions
**Prevent overselling tickets at all costs.**

When creating an order:
1. Check available quantity
2. Reserve tickets (increment sold count)
3. Create order
4. Generate tickets with QR codes
5. Create Stripe Payment Intent

**All of this must happen in a single database transaction.** If any step fails, rollback everything.

### 3. Audit Everything (Admin Actions)
**Every admin action must create an audit log entry.**

When an admin:
- Changes platform config
- Creates pricing override
- Issues refund
- Triggers payout
- Changes another admin's role

Create entry in `AuditLog` table with:
- Who (adminId)
- What (action type)
- When (timestamp)
- Previous value (JSON)
- New value (JSON)
- Why (reason, if provided)
- Where (IP address, user agent)

### 4. Payout Timing
**Organizers get paid 24 hours after event ends, automatically.**

Implementation:
- Scheduled job runs hourly
- Finds events that ended 24+ hours ago
- Calculates organizer's share (basePrice × tickets sold - refunds)
- Creates Stripe Transfer to organizer's Connect account
- Creates `Payout` record
- Sends email confirmation

### 5. Ticket Scanning
**Each ticket can only be scanned once.**

Validation logic:
1. Look up ticket by QR code
2. Verify eventId matches
3. Check status is 'VALID' (not 'SCANNED', 'REFUNDED', etc.)
4. Update status to 'SCANNED' atomically
5. Set scannedAt timestamp
6. Return success/failure immediately

---

## Development Priorities

### Week 1: Foundation
**Goal:** Database and authentication working

1. Database setup (Prisma + PostgreSQL)
2. User registration and login
3. Session management
4. Basic event CRUD (create, read, update, delete)

**Test:** Admin can log in, create event, view event in public listing

---

### Week 2: Payments & Tickets
**Goal:** End-to-end ticket purchase works

1. Stripe integration setup
2. Checkout API endpoint
3. Payment processing with webhooks
4. Ticket generation with QR codes
5. Email delivery (Resend)
6. SMS delivery (Twilio)

**Test:** User can buy ticket, receive it via email/SMS, see QR code

---

### Week 3: Validation & Organizers
**Goal:** Scanner works, organizers can manage events

1. Ticket validation API (scanner)
2. QR code scanning logic (prevent duplicates)
3. Organizer dashboard with real sales data
4. Event order listing
5. Basic analytics (revenue, ticket count)

**Test:** Organizer can scan ticket at entry, see real-time sales

---

### Week 4: Admin & Payouts
**Goal:** Platform management tools work

1. Platform config CRUD (dynamic fees)
2. Pricing overrides per event
3. Audit log system
4. Payout calculation and Stripe transfers
5. Refund processing
6. Admin analytics with real data

**Test:** Admin can change fees, create override, view audit logs, trigger payout

---

## How to Get Unstuck

### Common Questions

**Q: Should I use NextAuth.js or build custom auth?**  
A: NextAuth.js. Don't reinvent the wheel. See API Specification → Authentication section.

**Q: Which database provider should I use?**  
A: Supabase (easiest) or Neon (faster). Both have free tiers. Local PostgreSQL also works.

**Q: How do I test Stripe without real money?**  
A: Use Stripe test mode. Test card: `4242 4242 4242 4242`. See Stripe docs.

**Q: How do I generate QR codes?**  
A: Use `qrcode` npm package. Encode ticket ID in QR code. Store as data URL or image.

**Q: What's the difference between order and ticket?**  
A: One order can have multiple tickets. Order = purchase transaction. Ticket = individual entry pass.

**Q: Can I change the database schema?**  
A: Yes, but discuss major changes first. Use Prisma migrations to track changes.

**Q: The UI has a feature not in the API spec. Should I build it?**  
A: No. Stick to API spec. If it's critical, flag it for discussion.

**Q: How do I handle webhook failures?**  
A: Stripe retries automatically. Log all webhooks. Add idempotency key check to prevent duplicates.

---

## Communication

### Daily Updates
Share quick progress updates:
- What you built today
- What's blocking you
- What you're building tomorrow

### Weekly Sync
60-minute call to:
- Demo what's working
- Discuss challenges
- Adjust priorities if needed

### When to Ask for Help
- You're stuck for > 2 hours
- Requirements unclear
- Major technical decision needed
- Something seems wrong in the specs

Don't waste time spinning. Ask early.

---

## Testing Requirements

### Manual Testing (Required)
Before marking feature "done":
- Test happy path (everything works)
- Test error cases (bad input, network failure)
- Test edge cases (empty state, max values)
- Test on mobile (at least iPhone Safari)

### Automated Testing (Nice to Have)
If time permits:
- Unit tests for pricing logic
- Integration tests for checkout flow
- API endpoint tests

But ship working code first, add tests later if needed.

---

## What Success Looks Like

**By Day 30, the platform should:**

**For Customers:**
- ✅ Browse events (real data from database)
- ✅ Purchase tickets (Stripe payment)
- ✅ Receive tickets via SMS + email (< 30 seconds)
- ✅ View tickets with QR codes
- ✅ Scan into event successfully

**For Organizers:**
- ✅ Create account and get approved
- ✅ Create event in < 5 minutes
- ✅ View real-time sales dashboard
- ✅ Scan tickets at entry (validation works)
- ✅ Receive payout 24 hours after event

**For Admins:**
- ✅ View platform-wide analytics (real data)
- ✅ Change platform fees without code deploy
- ✅ Create pricing overrides for specific events
- ✅ View complete audit trail
- ✅ Manually trigger payouts if needed

**System Requirements:**
- ✅ No overselling (atomic transactions work)
- ✅ No duplicate ticket scans
- ✅ Payment success rate > 98%
- ✅ Email/SMS delivery > 95%
- ✅ Every admin action logged

---

## Final Notes

**Remember:**
- Ship working features, not perfect code
- Focus on the 90% use case first
- When in doubt, check the Mission & Vision doc
- You're building infrastructure, not a consumer app
- Boring technology is good technology

**You've got this.** The specs are complete, the UI is built, and the path is clear.

Build fast, test thoroughly, ship confidently.

Let's make ticketing simple. 🎟️

---

## Quick Reference

**Documents Priority:**
1. Mission & Vision (understand why)
2. Database Schema (implement data layer)
3. API Specification (implement endpoints)
4. Functional Doc (reference only)

**Week 1 Focus:** Database + Auth  
**Week 2 Focus:** Payments + Tickets  
**Week 3 Focus:** Scanner + Organizers  
**Week 4 Focus:** Admin + Payouts  

**Questions?** Let's talk.