# EasyTix API Specification v1.0

**Base URL:** `https://api.easytix.com/v1`  
**Authentication:** JWT Bearer tokens  
**Date Format:** ISO 8601 (e.g., `2025-01-15T14:30:00Z`)  
**Currency:** All amounts in cents (e.g., `5000` = $50.00)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Platform Configuration (Admin)](#platform-configuration)
3. [Events Management](#events-management)
4. [Ticket Tiers](#ticket-tiers)
5. [Orders & Checkout](#orders--checkout)
6. [Tickets & Validation](#tickets--validation)
7. [Promo Codes](#promo-codes)
8. [Refunds](#refunds)
9. [Payouts](#payouts)
10. [Organizer Management](#organizer-management)
11. [Admin Audit Logs](#admin-audit-logs)
12. [Error Handling](#error-handling)

---

## Authentication

### Register User
```http
POST /auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Email already exists
- `400` - Invalid email format
- `400` - Password too weak (min 8 chars)

---

### Login
```http
POST /auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-01-16T14:30:00Z"
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account suspended

---

### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "usr_abc123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER",
  "emailVerified": true,
  "phoneVerified": false,
  "createdAt": "2025-01-10T08:30:00Z"
}
```

---

## Platform Configuration

### Get Active Config (Public)
```http
GET /config/active
```

**Response (200):**
```json
{
  "id": "cfg_xyz789",
  "version": 3,
  "platformFeePercent": 300,
  "platformFeeFixed": 0,
  "platformMarkupPercent": 700,
  "freeEventMonthlyFee": 2999,
  "minTicketPrice": 100,
  "maxTicketPrice": 1000000,
  "maxTicketsPerOrder": 10,
  "allowTransfers": true,
  "allowPromoCodes": true,
  "effectiveFrom": "2025-01-15T00:00:00Z"
}
```

**Note:** This endpoint is public (no auth) so the checkout page can calculate fees.

---

### Create Platform Config (Admin Only)
```http
POST /admin/config
Authorization: Bearer {admin_token}
Permission: config:create
```

**Request:**
```json
{
  "platformFeePercent": 300,
  "platformFeeFixed": 0,
  "platformMarkupPercent": 700,
  "freeEventMonthlyFee": 2999,
  "minTicketPrice": 100,
  "maxTicketPrice": 1000000,
  "maxTicketsPerOrder": 10,
  "allowTransfers": true,
  "allowPromoCodes": true,
  "effectiveFrom": "2025-02-01T00:00:00Z",
  "reason": "Adjusting fees to remain competitive"
}
```

**Response (201):**
```json
{
  "id": "cfg_new456",
  "version": 4,
  "platformFeePercent": 300,
  "platformFeeFixed": 0,
  "platformMarkupPercent": 700,
  "isActive": false,
  "effectiveFrom": "2025-02-01T00:00:00Z",
  "createdAt": "2025-01-15T14:30:00Z",
  "createdBy": "adm_john123"
}
```

**Side Effects:**
- Creates audit log entry (`CONFIG_CREATED`)
- If `effectiveFrom` is now, deactivates previous config
- If future date, both configs exist until cutover

**Errors:**
- `403` - Insufficient permissions
- `400` - Total platform take exceeds 10% (warning only)

---

### List Config History (Admin Only)
```http
GET /admin/config/history?limit=10
Authorization: Bearer {admin_token}
Permission: config:view
```

**Response (200):**
```json
{
  "configs": [
    {
      "id": "cfg_xyz789",
      "version": 3,
      "platformFeePercent": 300,
      "platformMarkupPercent": 700,
      "isActive": true,
      "effectiveFrom": "2025-01-15T00:00:00Z",
      "effectiveUntil": null,
      "createdBy": "adm_jane456",
      "createdAt": "2025-01-15T09:00:00Z"
    },
    {
      "id": "cfg_old234",
      "version": 2,
      "platformFeePercent": 350,
      "platformMarkupPercent": 700,
      "isActive": false,
      "effectiveFrom": "2024-12-01T00:00:00Z",
      "effectiveUntil": "2025-01-14T23:59:59Z",
      "createdBy": "adm_john123",
      "createdAt": "2024-11-28T10:00:00Z"
    }
  ],
  "total": 12
}
```

---

## Events Management

### Create Event (Organizer)
```http
POST /events
Authorization: Bearer {organizer_token}
```

**Request:**
```json
{
  "title": "Drake Concert",
  "description": "Experience Drake live in Toronto...",
  "venue": "Scotiabank Arena",
  "address": "40 Bay Street",
  "city": "Toronto",
  "state": "ON",
  "zipCode": "M5J 2X2",
  "startDate": "2025-06-15T20:00:00Z",
  "endDate": "2025-06-15T23:00:00Z",
  "timezone": "America/Toronto",
  "coverImage": "https://cdn.easytix.com/events/drake-cover.jpg",
  "isFree": false,
  "currency": "CAD"
}
```

**Response (201):**
```json
{
  "id": "evt_drake001",
  "organizerId": "org_livenation",
  "title": "Drake Concert",
  "status": "DRAFT",
  "isFree": false,
  "createdAt": "2025-01-15T14:30:00Z",
  "editUrl": "https://app.easytix.com/organizer/events/evt_drake001/edit"
}
```

**Notes:**
- Event created in `DRAFT` status by default
- Must add ticket tiers before publishing
- Organizer's Stripe account must be connected if not free event

---

### Publish Event
```http
PATCH /events/{eventId}/publish
Authorization: Bearer {organizer_token}
```

**Request:**
```json
{
  "publishedAt": "2025-01-15T15:00:00Z"
}
```

**Response (200):**
```json
{
  "id": "evt_drake001",
  "status": "PUBLISHED",
  "publishedAt": "2025-01-15T15:00:00Z",
  "publicUrl": "https://easytix.com/events/evt_drake001"
}
```

**Validation:**
- Must have at least one active ticket tier
- Organizer Stripe account must be connected (if paid event)
- Event date must be in the future

**Errors:**
- `400` - No ticket tiers configured
- `400` - Stripe account not connected
- `403` - Not the event organizer

---

### Get Event Details (Public)
```http
GET /events/{eventId}
```

**Response (200):**
```json
{
  "id": "evt_drake001",
  "title": "Drake Concert",
  "description": "Experience Drake live...",
  "venue": "Scotiabank Arena",
  "address": "40 Bay Street",
  "city": "Toronto",
  "state": "ON",
  "zipCode": "M5J 2X2",
  "startDate": "2025-06-15T20:00:00Z",
  "endDate": "2025-06-15T23:00:00Z",
  "timezone": "America/Toronto",
  "coverImage": "https://cdn.easytix.com/events/drake-cover.jpg",
  "status": "PUBLISHED",
  "isFree": false,
  "currency": "CAD",
  "organizer": {
    "id": "org_livenation",
    "businessName": "Live Nation",
    "businessEmail": "contact@livenation.com"
  },
  "ticketTiers": [
    {
      "id": "tier_ga001",
      "name": "General Admission",
      "description": "Standing room only",
      "totalQuantity": 5000,
      "soldQuantity": 1247,
      "availableQuantity": 3753,
      "pricing": {
        "basePrice": 12000,
        "platformMarkup": 840,
        "platformFee": 360,
        "totalPrice": 13200
      },
      "isActive": true,
      "saleStartDate": null,
      "saleEndDate": "2025-06-15T19:00:00Z"
    },
    {
      "id": "tier_vip001",
      "name": "VIP",
      "description": "Premium seating with meet & greet",
      "totalQuantity": 200,
      "soldQuantity": 200,
      "availableQuantity": 0,
      "pricing": {
        "basePrice": 50000,
        "platformMarkup": 3500,
        "platformFee": 1500,
        "totalPrice": 55000
      },
      "isActive": true,
      "soldOut": true
    }
  ]
}
```

---

### Browse Events (Public)
```http
GET /events?city=Toronto&startDate=2025-06-01&limit=20&offset=0
```

**Query Parameters:**
- `city` - Filter by city
- `state` - Filter by state
- `startDate` - Events after this date (ISO 8601)
- `endDate` - Events before this date
- `search` - Full-text search in title/description
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset

**Response (200):**
```json
{
  "events": [
    {
      "id": "evt_drake001",
      "title": "Drake Concert",
      "venue": "Scotiabank Arena",
      "city": "Toronto",
      "startDate": "2025-06-15T20:00:00Z",
      "coverImage": "https://cdn.easytix.com/events/drake-cover.jpg",
      "lowestPrice": 13200,
      "currency": "CAD",
      "availableTickets": 3753
    }
  ],
  "total": 47,
  "limit": 20,
  "offset": 0
}
```

---

## Ticket Tiers

### Create Ticket Tier (Organizer)
```http
POST /events/{eventId}/tiers
Authorization: Bearer {organizer_token}
```

**Request:**
```json
{
  "name": "General Admission",
  "description": "Standing room only",
  "basePrice": 12000,
  "totalQuantity": 5000,
  "saleStartDate": null,
  "saleEndDate": "2025-06-15T19:00:00Z",
  "isActive": true
}
```

**Response (201):**
```json
{
  "id": "tier_ga001",
  "eventId": "evt_drake001",
  "name": "General Admission",
  "basePrice": 12000,
  "platformMarkup": 840,
  "platformFee": 360,
  "totalPrice": 13200,
  "totalQuantity": 5000,
  "soldQuantity": 0,
  "appliedConfig": {
    "configId": "cfg_xyz789",
    "feePercent": 300,
    "markupPercent": 700
  },
  "createdAt": "2025-01-15T14:35:00Z"
}
```

**Pricing Calculation Logic:**
```javascript
// Backend calculates fees automatically
const config = await getActivePlatformConfig()
const override = await getEventPricingOverride(eventId)

const feePercent = override?.platformFeePercent ?? config.defaultPlatformFeePercent
const markupPercent = override?.platformMarkupPercent ?? config.defaultPlatformMarkupPercent

const platformMarkup = Math.floor(basePrice * (markupPercent / 10000))
const platformFee = Math.floor(basePrice * (feePercent / 10000))
const totalPrice = basePrice + platformMarkup + platformFee

// Store all three values for audit trail
```

**Errors:**
- `400` - Price below minimum (from platform config)
- `400` - Price above maximum
- `403` - Not the event organizer
- `400` - Event already published (cannot add tiers after publish)

---

## Orders & Checkout

### Calculate Order Total (Pre-checkout)
```http
POST /orders/calculate
```

**Request:**
```json
{
  "items": [
    {
      "ticketTierId": "tier_ga001",
      "quantity": 2
    }
  ],
  "promoCode": "EARLYBIRD"
}
```

**Response (200):**
```json
{
  "subtotal": 26400,
  "platformFees": 720,
  "promoDiscount": 2640,
  "total": 24480,
  "breakdown": [
    {
      "tierName": "General Admission",
      "quantity": 2,
      "unitPrice": 13200,
      "subtotal": 26400
    }
  ],
  "promoCodeApplied": {
    "code": "EARLYBIRD",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "amountSaved": 2640
  }
}
```

**Notes:**
- This endpoint does NOT reserve tickets
- Used for checkout preview
- No authentication required

---

### Create Order (Checkout)
```http
POST /orders
Authorization: Bearer {user_token}
```

**Request:**
```json
{
  "eventId": "evt_drake001",
  "items": [
    {
      "ticketTierId": "tier_ga001",
      "quantity": 2
    }
  ],
  "promoCode": "EARLYBIRD",
  "buyerEmail": "john@example.com",
  "buyerPhone": "+14165551234",
  "buyerFirstName": "John",
  "buyerLastName": "Doe"
}
```

**Response (201):**
```json
{
  "orderId": "ord_abc123",
  "orderNumber": "ET-2025-001234",
  "subtotal": 26400,
  "platformFees": 720,
  "promoDiscount": 2640,
  "total": 24480,
  "currency": "CAD",
  "paymentStatus": "PENDING",
  "stripeClientSecret": "pi_abc123_secret_xyz789",
  "expiresAt": "2025-01-15T14:45:00Z"
}
```

**Backend Logic:**
1. Validate ticket availability (atomic check)
2. Lock inventory (reserve tickets for 10 minutes)
3. Apply promo code (validate and increment usage)
4. Create Stripe Payment Intent
5. Create order with `PENDING` status
6. Create ticket records with `qrCode` pre-generated
7. Return client secret for Stripe.js

**Errors:**
- `400` - Tickets sold out
- `400` - Invalid promo code
- `400` - Quantity exceeds max per order (from config)
- `429` - Too many orders in short time (rate limit)

---

### Confirm Payment (Webhook Handler)
```http
POST /webhooks/stripe
```

**Stripe Event:** `payment_intent.succeeded`

**Backend Actions:**
1. Find order by `stripePaymentIntentId`
2. Update order status: `PENDING` → `SUCCEEDED`
3. Update order `paidAt` timestamp
4. Update ticket tier `soldQuantity`
5. Send confirmation email with tickets
6. Send SMS with ticket links (Twilio)
7. Release inventory lock

**Ticket Email Format:**
```
Subject: Your EasyTix Order #ET-2025-001234

Hi John,

Your tickets for Drake Concert are ready!

Order Details:
- Event: Drake Concert
- Date: June 15, 2025 at 8:00 PM
- Venue: Scotiabank Arena
- Tickets: 2x General Admission

View Your Tickets: https://easytix.com/tickets/ord_abc123

[QR Code 1] - Ticket #TIX-2025-005678
[QR Code 2] - Ticket #TIX-2025-005679

Important:
- Show QR code at entrance
- Each ticket valid for one entry
- Non-transferable (unless transferred via app)

Questions? Reply to this email.
```

---

### Get Order Details
```http
GET /orders/{orderId}
Authorization: Bearer {user_token}
```

**Response (200):**
```json
{
  "id": "ord_abc123",
  "orderNumber": "ET-2025-001234",
  "userId": "usr_john456",
  "eventId": "evt_drake001",
  "eventDetails": {
    "title": "Drake Concert",
    "startDate": "2025-06-15T20:00:00Z",
    "venue": "Scotiabank Arena",
    "coverImage": "https://cdn.easytix.com/events/drake-cover.jpg"
  },
  "subtotal": 26400,
  "platformFees": 720,
  "promoDiscount": 2640,
  "total": 24480,
  "currency": "CAD",
  "paymentStatus": "SUCCEEDED",
  "paidAt": "2025-01-15T14:32:45Z",
  "buyerEmail": "john@example.com",
  "buyerPhone": "+14165551234",
  "items": [
    {
      "tierName": "General Admission",
      "quantity": 2,
      "unitPrice": 13200,
      "subtotal": 26400
    }
  ],
  "tickets": [
    {
      "id": "tkt_001",
      "ticketNumber": "TIX-2025-005678",
      "qrCode": "https://easytix.com/qr/7f8a9b0c1d2e",
      "status": "VALID",
      "tierName": "General Admission"
    },
    {
      "id": "tkt_002",
      "ticketNumber": "TIX-2025-005679",
      "qrCode": "https://easytix.com/qr/3f4a5b6c7d8e",
      "status": "VALID",
      "tierName": "General Admission"
    }
  ],
  "createdAt": "2025-01-15T14:30:12Z"
}
```

---

### Get My Orders
```http
GET /orders/me?limit=10&offset=0
Authorization: Bearer {user_token}
```

**Response (200):**
```json
{
  "orders": [
    {
      "id": "ord_abc123",
      "orderNumber": "ET-2025-001234",
      "eventTitle": "Drake Concert",
      "eventDate": "2025-06-15T20:00:00Z",
      "total": 24480,
      "currency": "CAD",
      "ticketCount": 2,
      "paymentStatus": "SUCCEEDED",
      "createdAt": "2025-01-15T14:30:12Z"
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

---

## Tickets & Validation

### Get My Tickets
```http
GET /tickets/me?status=VALID
Authorization: Bearer {user_token}
```

**Query Parameters:**
- `status` - Filter by status (VALID, SCANNED, CANCELLED, REFUNDED)
- `eventId` - Filter by event

**Response (200):**
```json
{
  "tickets": [
    {
      "id": "tkt_001",
      "ticketNumber": "TIX-2025-005678",
      "qrCodeUrl": "https://easytix.com/qr/7f8a9b0c1d2e",
      "status": "VALID",
      "event": {
        "id": "evt_drake001",
        "title": "Drake Concert",
        "startDate": "2025-06-15T20:00:00Z",
        "venue": "Scotiabank Arena",
        "coverImage": "https://cdn.easytix.com/events/drake-cover.jpg"
      },
      "tier": {
        "name": "General Admission",
        "description": "Standing room only"
      },
      "orderId": "ord_abc123",
      "orderNumber": "ET-2025-001234"
    }
  ]
}
```

---

### Validate Ticket (Scanner App)
```http
POST /tickets/validate
Authorization: Bearer {scanner_token}
```

**Request:**
```json
{
  "qrCode": "7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
  "eventId": "evt_drake001",
  "scannerId": "usr_scanner01"
}
```

**Response (200) - Valid Ticket:**
```json
{
  "valid": true,
  "ticket": {
    "id": "tkt_001",
    "ticketNumber": "TIX-2025-005678",
    "status": "VALID",
    "holderName": "John Doe",
    "tierName": "General Admission",
    "eventTitle": "Drake Concert"
  },
  "message": "Ticket valid - entry granted",
  "scannedAt": "2025-06-15T19:45:23Z"
}
```

**Response (400) - Already Scanned:**
```json
{
  "valid": false,
  "error": "ALREADY_SCANNED",
  "message": "This ticket was already scanned",
  "previousScan": {
    "scannedAt": "2025-06-15T19:30:12Z",
    "scannedBy": "usr_scanner02"
  }
}
```

**Response (400) - Invalid Ticket:**
```json
{
  "valid": false,
  "error": "INVALID_TICKET",
  "message": "Ticket not found or invalid QR code"
}
```

**Response (400) - Wrong Event:**
```json
{
  "valid": false,
  "error": "WRONG_EVENT",
  "message": "This ticket is for a different event"
}
```

**Backend Logic:**
1. Find ticket by `qrCode`
2. Check if ticket exists
3. Check if `eventId` matches
4. Check if status is `VALID` (not SCANNED, CANCELLED, or REFUNDED)
5. If all valid:
   - Update status: `VALID` → `SCANNED`
   - Set `scannedAt` timestamp
   - Set `scannedBy` to scannerId
   - Return success
6. If invalid, return appropriate error

**Errors:**
- `404` - QR code not found
- `400` - Ticket already scanned
- `400` - Ticket cancelled or refunded
- `400` - Wrong event
- `403` - Scanner not authorized for this event

---

### Transfer Ticket
```http
POST /tickets/{ticketId}/transfer
Authorization: Bearer {user_token}
```

**Request:**
```json
{
  "recipientEmail": "jane@example.com",
  "message": "Hey Jane, can't make it anymore. Enjoy the show!"
}
```

**Response (200):**
```json
{
  "ticketId": "tkt_001",
  "transferredAt": "2025-01-16T10:30:00Z",
  "recipientEmail": "jane@example.com",
  "status": "TRANSFER_PENDING"
}
```

**Backend Logic:**
1. Check if transfers are enabled (platform config)
2. Check if ticket is `VALID` (not scanned/cancelled)
3. Check if event hasn't happened yet
4. Create transfer record
5. Send email to recipient with acceptance link
6. Lock ticket from being scanned until accepted
7. If recipient accepts:
   - Update `userId` to recipient
   - Update `transferredFrom` and `transferredTo`
   - Set `transferredAt`
   - Unlock ticket

**Errors:**
- `403` - Transfers disabled by platform
- `400` - Ticket already scanned
- `400` - Event already passed
- `400` - Not the ticket owner

---

## Promo Codes

### Create Promo Code (Organizer)
```http
POST /events/{eventId}/promo-codes
Authorization: Bearer {organizer_token}
```

**Request:**
```json
{
  "code": "EARLYBIRD",
  "description": "10% off for early buyers",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "maxUses": 100,
  "validFrom": "2025-01-15T00:00:00Z",
  "validUntil": "2025-02-15T23:59:59Z",
  "isActive": true
}
```

**Response (201):**
```json
{
  "id": "promo_abc123",
  "eventId": "evt_drake001",
  "code": "EARLYBIRD",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "maxUses": 100,
  "currentUses": 0,
  "validFrom": "2025-01-15T00:00:00Z",
  "validUntil": "2025-02-15T23:59:59Z",
  "isActive": true,
  "createdAt": "2025-01-15T14:40:00Z"
}
```

**Validation:**
- Code must be unique per event
- PERCENTAGE: value must be 1-100
- FIXED_AMOUNT: value in cents

---

### Validate Promo Code (Public)
```http
GET /events/{eventId}/promo-codes/validate?code=EARLYBIRD
```

**Response (200) - Valid:**
```json
{
  "valid": true,
  "code": "EARLYBIRD",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "description": "10% off for early buyers",
  "remainingUses": 87
}
```

**Response (400) - Invalid:**
```json
{
  "valid": false,
  "error": "CODE_EXPIRED",
  "message": "This promo code has expired"
}
```

**Validation Checks:**
1. Code exists for this event
2. `isActive` is true
3. Current date is between `validFrom` and `validUntil`
4. `currentUses` < `maxUses` (if `maxUses` is set)

---

## Refunds

### Issue Refund (Organizer or Admin)
```http
POST /orders/{orderId}/refunds
Authorization: Bearer {organizer_or_admin_token}
Permission: refund:issue
```

**Request:**
```json
{
  "amount": 24480,
  "reason": "Event cancelled due to weather",
  "initiatedBy": "usr_organizer123"
}
```

**Response (201):**
```json
{
  "id": "ref_xyz789",
  "orderId": "ord_abc123",
  "amount": 24480,
  "status": "PROCESSING",
  "stripeRefundId": "re_abc123",
  "reason": "Event cancelled due to weather",
  "initiatedBy": "usr_organizer123",
  "createdAt": "2025-01-16T10:00:00Z"
}
```

**Backend Logic:**
1. Check if refund amount ≤ order total
2. Create Stripe refund
3. Create refund record with `PROCESSING` status
4. Update order payment status
5. Update all tickets to `REFUNDED` status
6. Send refund confirmation email
7. Create audit log entry

**Webhook Handler** (`charge.refunded`):
1. Find refund by `stripeRefundId`
2. Update status: `PROCESSING` → `SUCCEEDED`
3. Set `processedAt` timestamp
4. Send final confirmation email

**Errors:**
- `400` - Refund amount exceeds order total
- `400` - Order already fully refunded
- `403` - Not authorized (must be organizer or admin)
- `500` - Stripe refund failed

---

### Get Refund Status
```http
GET /refunds/{refundId}
Authorization: Bearer {user_or_organizer_token}
```

**Response (200):**
```json
{
  "id": "ref_xyz789",
  "orderId": "ord_abc123",
  "amount": 24480,
  "currency": "CAD",
  "status": "SUCCEEDED",
  "reason": "Event cancelled due to weather",
  "initiatedBy": "usr_organizer123",
  "processedAt": "2025-01-16T10:05:32Z",
  "createdAt": "2025-01-16T10:00:00Z"
}
```

---

## Payouts

### Calculate Event Payout (Internal/Scheduled Job)
```http
POST /admin/payouts/calculate
Authorization: Bearer {admin_token}
Permission: payout:trigger
```

**Request:**
```json
{
  "eventId": "evt_drake001"
}
```

**Response (200):**
```json
{
  "eventId": "evt_drake001",
  "organizerId": "org_livenation",
  "calculation": {
    "totalOrders": 1247,
    "totalTicketsSold": 2845,
    "grossRevenue": 3567500,
    "organizerBaseRevenue": 3060000,
    "platformMarkup": 214200,
    "platformFees": 91800,
    "refundedAmount": 50000,
    "netPayoutAmount": 3010000
  },
  "breakdown": [
    {
      "tierName": "General Admission",
      "ticketsSold": 2645,
      "basePrice": 12000,
      "organizerRevenue": 3174000
    },
    {
      "tierName": "VIP",
      "ticketsSold": 200,
      "basePrice": 50000,
      "organizerRevenue": 10000000
    }
  ],
  "eligibleForPayout": true,
  "payoutDelay": "24 hours after event",
  "estimatedPayoutDate": "2025-06-16T23:00:00Z"
}
```

**Calculation Logic:**
```javascript
// For each order where paymentStatus = 'SUCCEEDED'
const orders = await prisma.order.findMany({
  where: {
    eventId,
    paymentStatus: 'SUCCEEDED'
  },
  include: {
    items: true,
    refunds: true
  }
})

let organizerTotal = 0

orders.forEach(order => {
  order.items.forEach(item => {
    // item.unitPrice = basePrice + platformMarkup
    // We need to extract just the basePrice
    const tier = await prisma.ticketTier.findUnique({
      where: { id: item.ticketTierId }
    })
    
    organizerTotal += (tier.basePrice * item.quantity)
  })
  
  // Subtract refunded amounts
  order.refunds.forEach(refund => {
    if (refund.status === 'SUCCEEDED') {
      // Calculate what portion was organizer's
      const refundOrganizerPortion = calculateOrganizerPortion(refund.amount, order)
      organizerTotal -= refundOrganizerPortion
    }
  })
})

return organizerTotal
```

---

### Trigger Payout (Admin or Automated)
```http
POST /admin/payouts/trigger
Authorization: Bearer {admin_token}
Permission: payout:trigger
```

**Request:**
```json
{
  "eventId": "evt_drake001",
  "organizerId": "org_livenation",
  "amount": 3010000,
  "currency": "CAD"
}
```

**Response (201):**
```json
{
  "id": "pay_xyz123",
  "eventId": "evt_drake001",
  "organizerId": "org_livenation",
  "amount": 3010000,
  "currency": "CAD",
  "status": "PROCESSING",
  "stripeTransferId": "tr_abc456def789",
  "createdAt": "2025-06-16T23:00:00Z"
}
```

**Backend Logic:**
1. Verify event has ended (check `endDate`)
2. Verify payout delay has passed (24 hours from platform config)
3. Calculate exact payout amount
4. Verify organizer has Stripe Connect account
5. Create Stripe Transfer to organizer's connected account:
   ```javascript
   const transfer = await stripe.transfers.create({
     amount: 3010000,
     currency: 'CAD',
     destination: organizer.stripeAccountId,
     description: `Payout for Drake Concert (evt_drake001)`,
     metadata: {
       eventId: 'evt_drake001',
       organizerId: 'org_livenation'
     }
   })
   ```
6. Create payout record with `PROCESSING` status
7. Create audit log entry (`PAYOUT_TRIGGERED`)
8. Send email to organizer: "Your payout is being processed"

**Webhook Handler** (`transfer.paid`):
1. Find payout by `stripeTransferId`
2. Update status: `PROCESSING` → `PAID`
3. Set `paidAt` timestamp
4. Send confirmation email to organizer
5. Create audit log (`PAYOUT_SUCCEEDED`)

**Errors:**
- `400` - Event not yet ended
- `400` - Payout delay not met (too soon after event)
- `400` - No Stripe account connected
- `400` - Payout already processed for this event
- `500` - Stripe transfer failed

---

### Get Organizer Payouts
```http
GET /organizers/{organizerId}/payouts?limit=10&offset=0
Authorization: Bearer {organizer_token}
```

**Response (200):**
```json
{
  "payouts": [
    {
      "id": "pay_xyz123",
      "amount": 3010000,
      "currency": "CAD",
      "status": "PAID",
      "eventTitle": "Drake Concert",
      "eventDate": "2025-06-15T20:00:00Z",
      "paidAt": "2025-06-16T23:15:47Z",
      "createdAt": "2025-06-16T23:00:00Z"
    },
    {
      "id": "pay_abc789",
      "amount": 125000,
      "currency": "CAD",
      "status": "PENDING",
      "eventTitle": "Jazz Night Live",
      "eventDate": "2025-02-20T19:00:00Z",
      "estimatedPayoutDate": "2025-02-21T23:00:00Z",
      "createdAt": null
    }
  ],
  "total": 15,
  "totalPaid": 12450000,
  "totalPending": 875000
}
```

---

### Get Payout Details
```http
GET /payouts/{payoutId}
Authorization: Bearer {organizer_or_admin_token}
```

**Response (200):**
```json
{
  "id": "pay_xyz123",
  "organizerId": "org_livenation",
  "eventId": "evt_drake001",
  "eventTitle": "Drake Concert",
  "eventDate": "2025-06-15T20:00:00Z",
  "amount": 3010000,
  "currency": "CAD",
  "status": "PAID",
  "stripeTransferId": "tr_abc456def789",
  "breakdown": {
    "totalTicketsSold": 2845,
    "grossRevenue": 3567500,
    "organizerRevenue": 3060000,
    "platformRevenue": 306000,
    "refundedAmount": 50000,
    "netPayout": 3010000
  },
  "paidAt": "2025-06-16T23:15:47Z",
  "createdAt": "2025-06-16T23:00:00Z"
}
```

---

## Organizer Management

### Create Organizer Profile
```http
POST /organizers
Authorization: Bearer {user_token}
```

**Request:**
```json
{
  "businessName": "Live Nation",
  "businessEmail": "contact@livenation.com",
  "businessPhone": "+14165551234"
}
```

**Response (201):**
```json
{
  "id": "org_livenation",
  "businessName": "Live Nation",
  "businessEmail": "contact@livenation.com",
  "businessPhone": "+14165551234",
  "stripeOnboarded": false,
  "subscriptionStatus": "INACTIVE",
  "createdAt": "2025-01-15T14:50:00Z",
  "stripeConnectUrl": "https://connect.stripe.com/oauth/authorize?..."
}
```

**Backend Logic:**
1. Create organizer record
2. Add current user to organizer team
3. Generate Stripe Connect OAuth URL
4. Return URL for frontend to redirect user

---

### Connect Stripe Account (OAuth Callback)
```http
GET /organizers/{organizerId}/stripe/callback?code=ac_abc123
```

**Backend Logic:**
1. Exchange OAuth code for Stripe account ID:
   ```javascript
   const response = await stripe.oauth.token({
     grant_type: 'authorization_code',
     code: req.query.code
   })
   
   const stripeAccountId = response.stripe_user_id
   ```
2. Update organizer record:
   ```javascript
   await prisma.organizer.update({
     where: { id: organizerId },
     data: {
       stripeAccountId,
       stripeOnboarded: true
     }
   })
   ```
3. Send confirmation email
4. Redirect to organizer dashboard

**Response (302):**
```
Location: https://app.easytix.com/organizer/dashboard?connected=true
```

---

### Add Team Member (Organizer)
```http
POST /organizers/{organizerId}/team
Authorization: Bearer {organizer_token}
```

**Request:**
```json
{
  "email": "teammate@livenation.com",
  "role": "MANAGER"
}
```

**Response (201):**
```json
{
  "userId": "usr_teammate01",
  "organizerId": "org_livenation",
  "email": "teammate@livenation.com",
  "role": "MANAGER",
  "invitedAt": "2025-01-15T15:00:00Z"
}
```

**Backend Logic:**
1. Check if user exists by email
2. If not, create user account and send invite email
3. Add user to organizer's team
4. Grant ORGANIZER role to user

---

## Admin Audit Logs

### Get Audit Logs (Admin Only)
```http
GET /admin/audit?action=CONFIG_UPDATED&adminId=adm_john123&startDate=2025-01-01&limit=50
Authorization: Bearer {admin_token}
Permission: audit:view
```

**Query Parameters:**
- `action` - Filter by action type (CONFIG_UPDATED, REFUND_ISSUED, etc.)
- `adminId` - Filter by admin user
- `entityType` - Filter by entity (PlatformConfig, Event, Refund, etc.)
- `entityId` - Filter by specific entity ID
- `startDate` - Logs after this date
- `endDate` - Logs before this date
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

**Response (200):**
```json
{
  "logs": [
    {
      "id": "log_abc123",
      "adminId": "adm_john123",
      "adminName": "John Doe",
      "action": "CONFIG_UPDATED",
      "entityType": "PlatformConfig",
      "entityId": "cfg_xyz789",
      "previousValue": {
        "platformFeePercent": 350,
        "platformMarkupPercent": 700
      },
      "newValue": {
        "platformFeePercent": 300,
        "platformMarkupPercent": 700
      },
      "reason": "Reducing fees to match competitors",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-01-15T14:30:00Z"
    }
  ],
  "total": 247,
  "limit": 50,
  "offset": 0
}
```

---

### Get Audit Log Details
```http
GET /admin/audit/{logId}
Authorization: Bearer {admin_token}
Permission: audit:view
```

**Response (200):**
```json
{
  "id": "log_abc123",
  "adminId": "adm_john123",
  "admin": {
    "id": "adm_john123",
    "userId": "usr_john456",
    "name": "John Doe",
    "email": "john@easytix.com",
    "role": "SUPER_ADMIN"
  },
  "action": "CONFIG_UPDATED",
  "entityType": "PlatformConfig",
  "entityId": "cfg_xyz789",
  "previousValue": {
    "platformFeePercent": 350,
    "platformMarkupPercent": 700,
    "version": 2
  },
  "newValue": {
    "platformFeePercent": 300,
    "platformMarkupPercent": 700,
    "version": 3
  },
  "reason": "Reducing fees to match competitors",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "createdAt": "2025-01-15T14:30:00Z",
  "relatedLogs": [
    {
      "id": "log_def456",
      "action": "CONFIG_CREATED",
      "createdAt": "2025-01-15T14:29:55Z"
    }
  ]
}
```

---

## Error Handling

### Standard Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Email must be valid"
      }
    ],
    "requestId": "req_abc123xyz789",
    "timestamp": "2025-01-15T14:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Validation errors, invalid parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions for action |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, race condition |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | External service (Stripe, Twilio) failed |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permission |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `TICKETS_SOLD_OUT` | No tickets available |
| `PAYMENT_FAILED` | Stripe payment failed |
| `ALREADY_SCANNED` | Ticket already scanned at entry |
| `INVALID_PROMO_CODE` | Promo code invalid or expired |
| `REFUND_FAILED` | Stripe refund failed |
| `PAYOUT_FAILED` | Stripe transfer failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

### Example Error Responses

**401 Unauthorized:**
```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid or expired token",
    "requestId": "req_xyz789",
    "timestamp": "2025-01-15T14:30:00Z"
  }
}
```

**403 Forbidden:**
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to perform this action",
    "requiredPermission": "config:create",
    "userRole": "SUPPORT_ADMIN",
    "requestId": "req_abc123",
    "timestamp": "2025-01-15T14:30:00Z"
  }
}
```

**400 Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "basePrice",
        "message": "Price must be between $1.00 and $10,000.00"
      },
      {
        "field": "totalQuantity",
        "message": "Quantity must be greater than 0"
      }
    ],
    "requestId": "req_def456",
    "timestamp": "2025-01-15T14:30:00Z"
  }
}
```

**429 Rate Limited:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60,
    "limit": 100,
    "remaining": 0,
    "resetAt": "2025-01-15T15:00:00Z",
    "requestId": "req_ghi789",
    "timestamp": "2025-01-15T14:30:00Z"
  }
}
```

---

## Rate Limiting

### Limits by Endpoint Category

| Category | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Order Creation | 10 requests | 1 minute |
| Ticket Validation | 1000 requests | 1 minute |
| Admin Config | 20 requests | 1 minute |
| General API | 100 requests | 1 minute |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642259400
```

### Handling Rate Limits

**Frontend Implementation:**
```javascript
async function makeRequest(url, options) {
  const response = await fetch(url, options)
  
  if (response.status === 429) {
    const data = await response.json()
    const retryAfter = data.error.retryAfter
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
    return makeRequest(url, options)
  }
  
  return response
}
```

---

## Authentication & Authorization

### JWT Token Structure

**Payload:**
```json
{
  "userId": "usr_abc123",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "permissions": [],
  "iat": 1642259400,
  "exp": 1642345800
}
```

**Admin Token Payload:**
```json
{
  "userId": "usr_john456",
  "email": "john@easytix.com",
  "role": "SUPER_ADMIN",
  "adminId": "adm_john123",
  "permissions": [
    "config:create",
    "config:update",
    "payout:trigger",
    "refund:issue",
    "audit:view"
  ],
  "iat": 1642259400,
  "exp": 1642345800
}
```

### Authorization Middleware

```javascript
// Example authorization check
function requirePermission(permission) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'No token provided'
        }
      })
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Check if user has required permission
      if (!decoded.permissions.includes(permission)) {
        // Log unauthorized access attempt
        await logAuditTrail(
          decoded.adminId,
          'PERMISSION_DENIED',
          'API',
          req.path,
          null,
          null,
          `Attempted ${permission}`,
          req
        )
        
        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You don\'t have permission to perform this action',
            requiredPermission: permission
          }
        })
      }
      
      req.user = decoded
      next()
    } catch (err) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid or expired token'
        }
      })
    }
  }
}
```

---

## Webhook Security

### Stripe Webhook Verification

```javascript
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature']
  
  let event
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  
  // Handle event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object)
      break
    case 'transfer.paid':
      await handlePayoutSuccess(event.data.object)
      break
    case 'charge.refunded':
      await handleRefundSuccess(event.data.object)
      break
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
  
  res.json({ received: true })
})
```

---

## Database Transactions

### Critical Atomic Operations

**Order Creation (Must be atomic):**
```javascript
await prisma.$transaction(async (tx) => {
  // 1. Check inventory
  const tier = await tx.ticketTier.findUnique({
    where: { id: ticketTierId }
  })
  
  const available = tier.totalQuantity - tier.soldQuantity
  if (available < quantity) {
    throw new Error('TICKETS_SOLD_OUT')
  }
  
  // 2. Update sold quantity
  await tx.ticketTier.update({
    where: { id: ticketTierId },
    data: { soldQuantity: { increment: quantity } }
  })
  
  // 3. Create order
  const order = await tx.order.create({
    data: { /* order data */ }
  })
  
  // 4. Create tickets with QR codes
  const tickets = []
  for (let i = 0; i < quantity; i++) {
    tickets.push({
      ticketNumber: generateTicketNumber(),
      qrCode: crypto.randomUUID(),
      orderId: order.id,
      eventId,
      ticketTierId,
      userId,
      originalUserId: userId
    })
  }
  
  await tx.ticket.createMany({ data: tickets })
  
  return order
})
```

**Ticket Scanning (Must be atomic):**
```javascript
await prisma.$transaction(async (tx) => {
  const ticket = await tx.ticket.findUnique({
    where: { qrCode },
    include: { event: true }
  })
  
  if (!ticket) throw new Error('INVALID_TICKET')
  if (ticket.status === 'SCANNED') throw new Error('ALREADY_SCANNED')
  if (ticket.eventId !== eventId) throw new Error('WRONG_EVENT')
  
  await tx.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'SCANNED',
      scannedAt: new Date(),
      scannedBy: scannerId
    }
  })
  
  return ticket
})
```

---

## Environment Variables

### Required Configuration

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/easytix"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="24h"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_CLIENT_ID="ca_..."

# Twilio (SMS)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+14165551234"

# Email (Resend recommended)
RESEND_API_KEY="re_..."
FROM_EMAIL="tickets@easytix.com"

# Frontend URLs
FRONTEND_URL="https://easytix.com"
ADMIN_URL="https://app.easytix.com/admin"

# Rate Limiting (Redis)
REDIS_URL="redis://localhost:6379"

# S3 (for event images)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="easytix-uploads"
AWS_REGION="us-east-1"
```

---

## Next Steps for Your Developer

### Week 1: Foundation
1. ✅ Set up Next.js API routes (or Express server)
2. ✅ Initialize Prisma with provided schema
3. ✅ Implement JWT authentication
4. ✅ Set up Stripe API connection
5. ✅ Build user registration/login endpoints

### Week 2: Core Features
6. ✅ Event creation & publishing
7. ✅ Ticket tier management with dynamic pricing
8. ✅ Order creation with Stripe Payment Intents
9. ✅ Webhook handlers (payment confirmation)
10. ✅ Ticket generation with QR codes

### Week 3: Advanced Features
11. ✅ Promo code system
12. ✅ Ticket validation/scanning API
13. ✅ Refund processing
14. ✅ Payout calculation & Stripe transfers
15. ✅ Admin audit logging

### Week 4: Integration & Testing
16. ✅ Email delivery (Resend)
17. ✅ SMS delivery (Twilio)
18. ✅ Rate limiting (Redis)
19. ✅ Error handling & monitoring
20. ✅ API documentation (Swagger/OpenAPI)

---

## Questions for Your Developer?

This specification should be comprehensive enough to build the entire backend. If your developer has questions about:

- **Stripe Connect flow** - I can provide detailed OAuth setup
- **Database optimization** - I can suggest indexes and query patterns
- **Testing strategy** - I can outline test cases for each endpoint
- **Deployment** - I can recommend hosting setup (Vercel, Railway, AWS)

Ready to start building! 🚀