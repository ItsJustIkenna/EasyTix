# EasyTix: Mission, Vision & Product Philosophy

**Developer Onboarding Document**  
*Last Updated: January 15, 2025*

---

## 🎯 The Problem We're Solving

### The Current Ticketing Landscape is Broken

**For Event Organizers:**
- Ticketmaster/Eventbrite charge **10-15% in fees** (often hidden from organizers)
- Complex dashboards requiring hours of training
- Slow payouts (7-14 days after event, sometimes longer)
- Difficult to set up for first-time organizers
- Limited customization and branding
- Poor customer support

**For Ticket Buyers:**
- **$20+ in "convenience fees"** on a $50 ticket
- Confusing checkout flows
- Tickets buried in email, hard to access
- Can't easily transfer tickets to friends
- No transparency on where fees go

**For Small/Medium Events:**
- High barriers to entry (minimum fees, monthly subscriptions)
- Feature bloat - tools they'll never use
- Built for stadiums, not community events
- Free events still cost money to host

### The Market Opportunity

- **$85 billion global ticketing market** (2024)
- **Growing 12% annually** - live events booming post-pandemic
- **60% of events are under 1,000 attendees** - underserved segment
- **Millennials/Gen Z expect seamless mobile experiences** - legacy platforms feel outdated
- **Creator economy explosion** - more people hosting events than ever

---

## 🚀 Our Mission

**"Make event ticketing simple, transparent, and fair for everyone."**

We believe:
1. **Organizers should keep most of the money** - they're doing the hard work
2. **Buyers deserve transparency** - no hidden fees at checkout
3. **Technology should be invisible** - create event → sell tickets → get paid
4. **Small events matter** - a 50-person poetry reading deserves great ticketing tools

---

## 🌟 Our Vision

**By 2027, EasyTix will be:**

- The **go-to platform for events under 5,000 attendees**
- Known for **the lowest fees in the industry** (under 10% total)
- The **easiest platform to set up** (create your first event in under 5 minutes)
- The **fastest payout** system (money in organizer's account within 24 hours of event)
- A **mobile-first experience** - tickets live in your phone, not buried in email

### Success Metrics (3 Years)
- 100,000+ events hosted annually
- $50M+ in gross ticket sales processed
- 4.8+ star rating from organizers and buyers
- 10,000+ active organizers on the platform
- <0.1% payment failure rate

---

## 🎨 Product Philosophy

### 1. Radical Simplicity

**Every feature must pass the "mom test":**  
*"Can my non-technical mom create an event in under 5 minutes without calling me?"*

**Examples:**
- ✅ Event creation: 3 fields minimum (title, date, price)
- ✅ Checkout: 2 steps (select tickets → pay)
- ✅ Ticket access: Open text message, tap QR code
- ❌ Complex seating charts (Phase 2, not MVP)
- ❌ Multi-day passes with add-ons (Phase 3)

**Developer Implication:**  
When building forms, default to fewer fields. When adding validation, make error messages helpful ("Price must be between $1 and $10,000" not "Invalid input"). When designing flows, count the clicks - if it's more than 3, simplify.

---

### 2. Transparent Pricing (Our Differentiator)

**Current Industry Standard:**
```
Ticket Price: $50.00
Service Fee: $8.75 (17.5% - hidden from organizer)
---
Customer Pays: $58.75
Organizer Gets: $45.25 (loses $4.75 to platform)
Platform Keeps: $13.50 (27% of organizer's price!)
```

**EasyTix Model:**
```
Ticket Price: $50.00 (organizer sets this)
Platform Markup: $3.50 (7% - our markup, invisible to customer)
Platform Fee: $1.50 (3% - shown transparently at checkout)
---
Customer Pays: $55.00
Organizer Gets: $50.00 (exactly what they set)
Platform Keeps: $5.00 (10% total - half of competitors)
```

**Our Commitment:**  
**Total platform take will NEVER exceed 10% of the organizer's base price.**

**Developer Implication:**  
The pricing calculation is sacred. Every ticket tier creation must fetch the active platform config and apply fees dynamically. If an admin changes fees, only NEW events are affected - existing events keep their original pricing. Build validation that warns if total platform take exceeds 10%.

---

### 3. Speed is a Feature

**Industry Standard:**
- Event approval: 24-48 hours
- Payout: 7-14 days after event
- Customer support response: 2-3 business days

**EasyTix Standard:**
- Event approval: **Instant** (no approval needed, trust by default)
- Payout: **24 hours after event ends** (automatic, no request needed)
- Customer support: **< 2 hour response time** (even on weekends)

**Developer Implication:**  
Every async operation needs a webhook or polling mechanism. Don't make users refresh pages. Use optimistic UI updates. When a payment succeeds, the order confirmation should appear in < 3 seconds. When an event publishes, it should be live immediately.

---

### 4. Mobile-First (Desktop is Secondary)

**User Behavior:**
- **78% of ticket purchases happen on mobile** (industry avg)
- **95% of tickets are accessed on mobile** (at venue entrance)
- **Organizers manage events on desktop** (creating events, viewing orders)

**Design Priorities:**
1. **Ticket buyer experience:** Optimized for iPhone/Android, 320px width minimum
2. **Scanner app:** Native mobile app or PWA for entry validation
3. **Organizer dashboard:** Desktop-optimized (they're at a computer)

**Developer Implication:**  
Test every customer-facing flow on a real phone. QR codes must be scannable even in bright sunlight. Forms must work with autocomplete and autofill. Buttons must be thumb-friendly (44px min height). Use responsive design, but optimize for mobile first, desktop second.

---

### 5. Trust by Default, Verify When Needed

**Our Approach:**
- Anyone can create an organizer account (no approval)
- Anyone can publish an event (no review)
- Anyone can sell tickets immediately
- We monitor for fraud patterns (automated)
- We respond to complaints quickly (human review)

**Why This Works:**
- **99% of organizers are legitimate** - don't punish them for the 1%
- **Friction kills conversion** - requiring approval means lost events
- **Speed to market matters** - organizers need tickets live NOW

**When We Intervene:**
- Chargebacks > 2% (automated flag for review)
- Customer complaints > 5 per event (human review)
- Event cancelled after tickets sold (require refunds)
- Suspicious pricing (e.g., $10,000 ticket for "Community Yoga")

**Developer Implication:**  
Don't build approval workflows into MVP. Build monitoring and alerting instead. Create admin tools to flag suspicious activity, but don't block legitimate organizers. Assume good faith until proven otherwise.

---

## 🧑‍💼 Our Target Customers

### Primary: Independent Event Organizers (80% of revenue)

**Who They Are:**
- Small business owners (coffee shops, breweries, yoga studios)
- Community organizers (neighborhood associations, nonprofits)
- Creators (musicians, comedians, artists)
- Fitness instructors (boot camps, group classes)
- Educators (workshops, seminars, conferences)

**Their Events:**
- 50-500 attendees typically
- $10-$100 ticket prices
- Local/regional (not national tours)
- Monthly or weekly recurring events
- Free events with optional donations

**What They Value:**
- **Low fees** (margins are tight)
- **Easy setup** (not tech-savvy)
- **Fast payouts** (cash flow matters)
- **Good customer support** (they're stressed enough)
- **Works on their phone** (managing events on-the-go)

**Example Personas:**

**Sarah - Yoga Studio Owner**
- 35 years old, runs small studio in Sacramento
- Hosts 5-10 workshops per month (30-50 attendees each)
- Charges $25-$45 per workshop
- Currently uses Eventbrite, hates the fees
- Wants: Simple setup, reliable ticket delivery, fast payouts

**Marcus - Independent Musician**
- 28 years old, plays local venues
- Books 2-3 shows per month (100-300 attendees)
- Charges $15-$30 per ticket
- Currently uses Instagram DMs + Venmo (messy)
- Wants: Professional checkout, proof of tickets sold, mobile-friendly

**Lisa - Nonprofit Event Coordinator**
- 42 years old, runs community fundraisers
- Hosts quarterly events (200-500 attendees)
- Mix of free events and $50-$100 galas
- Currently uses paper tickets or free Eventbrite
- Wants: No fees on free events, easy check-in, donor tracking

---

### Secondary: Venue Operators (15% of revenue)

**Who They Are:**
- Small music venues (capacity 200-1,000)
- Comedy clubs
- Theaters
- Conference centers

**What They Need:**
- Multi-event calendar management
- Box office integration
- Reserved seating (Phase 2)
- Season passes (Phase 3)

---

### Tertiary: Corporate Events (5% of revenue)

**Who They Are:**
- Company off-sites
- Team building events
- Professional conferences

**What They Need:**
- Bulk discounts
- Custom branding
- Invoicing (not credit cards)
- Attendee management

---

## 💡 Core Product Principles

### 1. No Feature Bloat

**We will NOT build:**
- ❌ Complex seating charts (use Ticketmaster if you need this)
- ❌ Membership tiers with recurring billing (Phase 3 maybe)
- ❌ Event discovery/social features (we're infrastructure, not a marketplace)
- ❌ White-label solutions (too complex for MVP)
- ❌ Advanced reporting (basic analytics only)

**We WILL build exceptionally well:**
- ✅ Event creation (dead simple)
- ✅ Ticket purchasing (2-step checkout)
- ✅ QR code validation (scanner app)
- ✅ Organizer payouts (automated, fast)
- ✅ Promo codes (simple percentage/fixed discounts)
- ✅ Ticket transfers (tap to send to friend)

**Decision Framework:**  
Before adding a feature, ask: **"Will this help Sarah sell more yoga workshop tickets?"**  
If no, defer it.

---

### 2. Make the Right Thing Easy

**Good Behavior Should Be Default:**
- ✅ Refund policy: Organizer-controlled (not platform-mandated)
- ✅ Ticket transfers: Enabled by default (don't lock tickets to buyers)
- ✅ Email receipts: Sent automatically (don't make them click "send")
- ✅ Mobile tickets: Default format (PDFs available if needed)

**Bad Behavior Should Be Hard:**
- ❌ Price gouging: Warn if ticket price > $10,000
- ❌ Last-minute cancellations: Require 48-hour notice or auto-refund
- ❌ No-shows: Track organizer reliability, flag if > 20% events cancelled

---

### 3. Optimize for the 90% Use Case

**Most events are simple:**
- Single date (not multi-day festivals)
- 2-3 ticket tiers (GA, VIP, Early Bird)
- General admission (not reserved seats)
- One-time purchase (not season passes)

**Developer Implication:**  
Build for the simple case first. Don't over-engineer for edge cases. If 90% of events have ≤ 3 ticket tiers, don't build a UI that supports 50 tiers. Make the common path fast, make the complex path possible.

---

## 🛠️ Technical Philosophy

### 1. Boring Technology is Good Technology

**Use Proven Tools:**
- PostgreSQL > MongoDB (ACID compliance matters for money)
- Prisma > raw SQL (type safety prevents bugs)
- Stripe > building our own payment processor (trust the experts)
- Next.js > custom framework (batteries included)

**Avoid Shiny Objects:**
- Don't use bleeding-edge frameworks
- Don't build what you can buy
- Don't optimize prematurely
- Don't microservices until you need them

---

### 2. Resilience Over Features

**Priorities:**
1. **Payment must always work** (99.99% uptime)
2. **Tickets must always deliver** (email + SMS redundancy)
3. **Scanner must work offline** (cache event data locally)
4. **Database must never lose data** (daily backups, point-in-time recovery)

**Acceptable Tradeoffs:**
- Dashboard loads slowly? OK for v1 (organizers will tolerate)
- Reporting has 5-minute delay? Fine (not real-time critical)
- Image upload is slow? Acceptable (not in checkout flow)

**Unacceptable:**
- Checkout fails? **Never acceptable** (we lose revenue)
- Ticket not delivered? **Never acceptable** (customer can't enter)
- Payout fails? **Never acceptable** (organizer trust lost)

---

### 3. Observability is Not Optional

**From Day 1:**
- Log every API request (but sanitize sensitive data)
- Track every payment attempt (success, failure, abandoned)
- Monitor every webhook (Stripe, Twilio, email)
- Alert on critical failures (Slack/email/SMS)

**Key Metrics to Track:**
```
Business Health:
- Orders per hour (should never drop to 0 during business hours)
- Payment success rate (> 98%)
- Email delivery rate (> 95%)
- Average time to checkout (< 2 minutes)

Technical Health:
- API response time p95 (< 500ms)
- Database query time p95 (< 100ms)
- Error rate (< 1%)
- Webhook processing time (< 5 seconds)
```

---

### 4. Security is a Feature, Not an Afterthought

**Non-Negotiable:**
- All passwords hashed with bcrypt (never store plaintext)
- All API endpoints require authentication (except public event listings)
- All admin actions logged (audit trail for compliance)
- All payments via Stripe (never touch credit cards)
- All sensitive data encrypted at rest (PII, payment info)

**Defense in Depth:**
- Rate limiting (prevent brute force)
- Input validation (prevent SQL injection, XSS)
- CSRF tokens (prevent cross-site attacks)
- Webhook signature verification (prevent spoofing)

---

## 📊 Success Criteria for MVP

### Launch Readiness Checklist

**Customer Can:**
- ✅ Browse events by city/date
- ✅ Purchase tickets in < 2 minutes
- ✅ Receive tickets via email + SMS within 30 seconds
- ✅ Access tickets from phone (QR code)
- ✅ Transfer ticket to a friend
- ✅ Use promo code for discount

**Organizer Can:**
- ✅ Create event in < 5 minutes
- ✅ Add 2-3 ticket tiers with custom pricing
- ✅ Publish event instantly (no approval)
- ✅ View real-time sales dashboard
- ✅ Issue full/partial refunds
- ✅ Receive payout 24 hours after event
- ✅ Add team members to manage event

**Admin Can:**
- ✅ Adjust platform fees without code deploy
- ✅ Create pricing overrides for specific events
- ✅ View all transactions and audit logs
- ✅ Trigger payouts manually if needed
- ✅ Issue refunds on behalf of organizers

**System Can:**
- ✅ Process 100 orders per minute
- ✅ Send 1,000 emails per hour
- ✅ Validate tickets at entry (even if phone offline)
- ✅ Recover from Stripe webhook failures
- ✅ Prevent overselling tickets (race condition safe)

---

## 🎯 Post-Launch Priorities

### Month 1-3: Stability & Feedback
1. Fix critical bugs (payment failures, ticket delivery issues)
2. Improve onboarding (reduce organizer drop-off)
3. Optimize checkout flow (increase conversion)
4. Add basic analytics (organizers want to see trends)

### Month 4-6: Growth Features
1. Scanner mobile app (native iOS/Android)
2. Recurring events (weekly yoga classes)
3. Group discounts (buy 10+ tickets, get 20% off)
4. Waitlist for sold-out events

### Month 7-12: Scale & Differentiation
1. Reserved seating (for venues)
2. Season passes (buy once, attend all events)
3. White-label checkout (custom branding)
4. Multi-currency support (expand internationally)

---

## 🤝 How to Make Decisions

When faced with a choice, use this framework:

### 1. Does it serve our mission?
**"Make event ticketing simple, transparent, and fair for everyone."**

Example: Should we add complex seat mapping?  
❌ No - violates "simple"

### 2. Does it help the 90% use case?
**Most events are 50-500 people, general admission.**

Example: Should we support NFT tickets?  
❌ No - helps < 1% of organizers

### 3. Does it maintain our pricing promise?
**Total platform take ≤ 10% of organizer's base price.**

Example: Should we add a "featured event" upsell fee?  
❌ No - adds hidden costs

### 4. Can we build it in < 2 weeks?
**Ship fast, iterate often.**

Example: Should we build a full CRM for organizers?  
❌ No - too complex, use existing tools

### 5. Would Sarah (yoga studio owner) use it?
**If our core persona wouldn't use it, defer it.**

Example: Should we add API webhooks for developers?  
❌ Not yet - Phase 2 feature

---

## 🚨 When to Reach Out

**You should definitely ask before:**
- Changing the pricing calculation logic
- Adding a new payment method (Bitcoin, etc.)
- Modifying the payout flow
- Building a feature not in the API spec
- Making database schema changes that affect existing data

**You have autonomy to:**
- Improve performance (caching, query optimization)
- Refactor code for readability
- Add helpful error messages
- Improve validation and error handling
- Choose specific libraries (as long as they're proven)

---

## 📚 Recommended Reading

To get in our headspace:

1. **"The Mom Test"** by Rob Fitzpatrick  
   *How to validate ideas by asking the right questions*

2. **"Obviously Awesome"** by April Dunford  
   *Positioning - why "simple, transparent, fair" matters*

3. **"Stripe Atlas Guides"**  
   *How Stripe thinks about payments (we want to be like them)*

4. **Basecamp's "Getting Real"**  
   *Build less, ship fast, stay simple*

---

## 💬 Our Voice & Tone

**We sound like:**
- A helpful friend, not a corporate robot
- Confident but not arrogant
- Transparent about how things work
- Apologetic when things break (and we fix them fast)

**Examples:**

❌ Bad: "An error has occurred. Please contact support with reference ID #47582."  
✅ Good: "Oops! Your payment didn't go through. Can you double-check your card details? If it still doesn't work, text us at (555) 123-4567."

❌ Bad: "Your payout is being processed according to our standard 7-14 day timeline."  
✅ Good: "Your $1,250 payout will hit your bank account by tomorrow at 5 PM. We'll text you when it's sent!"

❌ Bad: "To optimize your event performance, consider leveraging our advanced analytics dashboard."  
✅ Good: "Want to see which ticket tier is selling best? Check your dashboard."

---

## 🎉 Why This Will Work

**1. Timing is Perfect**
- Live events booming post-pandemic
- Creators need simple tools
- People hate Ticketmaster fees

**2. We Have Focus**
- Not trying to be Ticketmaster
- Not trying to be everything to everyone
- Serving the underserved (small events)

**3. We Have a Moat**
- Lowest fees (hard to undercut 10%)
- Fastest payouts (24 hours is exceptional)
- Simplest UX (others are bloated)

**4. We Can Execute**
- Lean team moves fast
- Proven technology stack
- Clear product vision

---

## 🤝 Working Together

**What I need from you:**
- Ask questions when something doesn't make sense
- Push back if a feature will take way longer than expected
- Suggest better approaches if you see them
- Focus on stability over features

**What you can expect from me:**
- Clear requirements (no vague specs)
- Quick responses to questions
- Trust in your technical decisions
- Gratitude when you ship great work

Let's build something people love. 🚀

---

*Questions? Let's talk. This is a living document - we'll update it as we learn.*