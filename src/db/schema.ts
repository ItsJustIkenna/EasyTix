import { pgTable, text, timestamp, uuid, varchar, integer, boolean, decimal, jsonb, pgEnum, index, check, unique, primaryKey } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("Role", ["CUSTOMER", "ORGANIZER", "ADMIN"]);
export const eventStatusEnum = pgEnum("EventStatus", ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]);
export const eventCategoryEnum = pgEnum("EventCategory", [
  "MUSIC",
  "SPORTS",
  "ARTS",
  "THEATER",
  "COMEDY",
  "CONFERENCE",
  "FESTIVAL",
  "NETWORKING",
  "WORKSHOP",
  "OTHER"
]);
export const ticketStatusEnum = pgEnum("TicketStatus", ["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED", "CHECKED_IN"]);
export const orderStatusEnum = pgEnum("OrderStatus", ["PENDING", "COMPLETED", "CANCELLED", "REFUNDED"]);
export const paymentStatusEnum = pgEnum("PaymentStatus", ["PENDING", "COMPLETED", "FAILED", "REFUNDED"]);
export const discountTypeEnum = pgEnum("DiscountType", ["PERCENTAGE", "FIXED"]);
export const refundStatusEnum = pgEnum("RefundStatus", ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);
export const payoutStatusEnum = pgEnum("PayoutStatus", ["PENDING", "SCHEDULED", "PAID", "FAILED"]);

// User table
export const users = pgTable("User", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  role: roleEnum("role").notNull().default("CUSTOMER"),
  isEmailVerified: boolean("isEmailVerified").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Organizer table
export const organizers = pgTable("Organizer", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessEmail: varchar("businessEmail", { length: 255 }).notNull(),
  businessPhone: varchar("businessPhone", { length: 20 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 20 }),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Event table
export const events = pgTable("Event", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: uuid("organizerId").notNull().references(() => organizers.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: eventCategoryEnum("category").notNull().default("OTHER"),
  venue: varchar("venue", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zipCode", { length: 20 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  timezone: varchar("timezone", { length: 100 }).notNull(),
  status: eventStatusEnum("status").notNull().default("DRAFT"),
  publishedAt: timestamp("publishedAt"),
  coverImage: text("coverImage"),
  images: jsonb("images").$type<string[]>(),
  isFree: boolean("isFree").notNull().default(false),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  organizerIdIdx: index("idx_events_organizer_id").on(table.organizerId),
  statusIdx: index("idx_events_status").on(table.status),
  startDateIdx: index("idx_events_start_date").on(table.startDate),
  statusStartDateIdx: index("idx_events_status_start_date").on(table.status, table.startDate),
  dateRangeCheck: check("chk_event_dates", sql`${table.endDate} >= ${table.startDate}`),
}));

// TicketTier table
export const ticketTiers = pgTable("TicketTier", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  basePrice: integer("basePrice").notNull(),
  platformMarkup: integer("platformMarkup").notNull().default(0),
  platformFee: integer("platformFee").notNull().default(0),
  totalQuantity: integer("totalQuantity").notNull(),
  soldQuantity: integer("soldQuantity").notNull().default(0),
  saleStartDate: timestamp("saleStartDate"),
  saleEndDate: timestamp("saleEndDate"),
  sortOrder: integer("sortOrder").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  eventIdIdx: index("idx_ticket_tiers_event_id").on(table.eventId),
  soldQuantityCheck: check("chk_sold_quantity", sql`${table.soldQuantity} >= 0 AND ${table.soldQuantity} <= ${table.totalQuantity}`),
  priceCheck: check("chk_positive_prices", sql`${table.basePrice} >= 0 AND ${table.platformMarkup} >= 0 AND ${table.platformFee} >= 0`),
}));

// Order table
export const orders = pgTable("Order", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  eventId: uuid("eventId").notNull().references(() => events.id, { onDelete: "restrict" }),
  promoCodeId: uuid("promoCodeId").references(() => promoCodes.id, { onDelete: "set null" }),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  totalAmount: integer("totalAmount").notNull(),
  discountAmount: integer("discountAmount").notNull().default(0),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_orders_user_id").on(table.userId),
  eventIdIdx: index("idx_orders_event_id").on(table.eventId),
  statusIdx: index("idx_orders_status").on(table.status),
  userCreatedIdx: index("idx_orders_user_created").on(table.userId, table.createdAt),
}));

// Ticket table
export const tickets = pgTable("Ticket", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  eventId: uuid("eventId").notNull().references(() => events.id, { onDelete: "restrict" }),
  tierId: uuid("tierId").notNull().references(() => ticketTiers.id, { onDelete: "restrict" }),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "restrict" }),
  attendeeName: varchar("attendeeName", { length: 255 }),
  attendeeEmail: varchar("attendeeEmail", { length: 255 }),
  attendeePhone: varchar("attendeePhone", { length: 20 }),
  price: integer("price").notNull(),
  status: ticketStatusEnum("status").notNull().default("PENDING"),
  qrCode: text("qrCode").unique(),
  checkedInAt: timestamp("checkedInAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_tickets_user_id").on(table.userId),
  orderIdIdx: index("idx_tickets_order_id").on(table.orderId),
  eventIdIdx: index("idx_tickets_event_id").on(table.eventId),
  tierIdIdx: index("idx_tickets_tier_id").on(table.tierId),
  statusIdx: index("idx_tickets_status").on(table.status),
  userStatusIdx: index("idx_tickets_user_status").on(table.userId, table.status),
  eventStatusIdx: index("idx_tickets_event_status").on(table.eventId, table.status),
}));

// Payment table
export const payments = pgTable("Payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => orders.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  orderIdIdx: index("idx_payments_order_id").on(table.orderId),
  stripeIntentIdx: index("idx_payments_stripe_intent").on(table.stripePaymentIntentId),
}));

// Token table (for authentication)
export const tokens = pgTable("Token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_tokens_user_id").on(table.userId),
  tokenIdx: index("idx_tokens_token").on(table.token),
}));

// Join table for Organizer to User (many-to-many)
export const organizerToUser = pgTable("_OrganizerToUser", {
  A: uuid("A").notNull().references(() => organizers.id, { onDelete: "cascade" }),
  B: uuid("B").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.A, table.B] }),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  tickets: many(tickets),
  tokens: many(tokens),
}));

export const organizersRelations = relations(organizers, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(organizers, {
    fields: [events.organizerId],
    references: [organizers.id],
  }),
  ticketTiers: many(ticketTiers),
  orders: many(orders),
  tickets: many(tickets),
}));

export const ticketTiersRelations = relations(ticketTiers, ({ one, many }) => ({
  event: one(events, {
    fields: [ticketTiers.eventId],
    references: [events.id],
  }),
  tickets: many(tickets),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [orders.eventId],
    references: [events.id],
  }),
  promoCode: one(promoCodes, {
    fields: [orders.promoCodeId],
    references: [promoCodes.id],
  }),
  tickets: many(tickets),
  payments: many(payments),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  order: one(orders, {
    fields: [tickets.orderId],
    references: [orders.id],
  }),
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
  tier: one(ticketTiers, {
    fields: [tickets.tierId],
    references: [ticketTiers.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// PromoCode table
export const promoCodes = pgTable("PromoCode", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("eventId").notNull().references(() => events.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  discountType: discountTypeEnum("discountType").notNull(),
  discountValue: integer("discountValue").notNull(),
  maxUses: integer("maxUses"),
  currentUses: integer("currentUses").notNull().default(0),
  validFrom: timestamp("validFrom").notNull(),
  validTo: timestamp("validTo").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  eventIdIdx: index("idx_promo_codes_event_id").on(table.eventId),
  codeIdx: index("idx_promo_codes_code").on(table.code),
  uniqueCodePerEvent: unique("uq_promo_event_code").on(table.eventId, table.code),
  usageCheck: check("chk_promo_usage", sql`${table.currentUses} >= 0 AND (${table.maxUses} IS NULL OR ${table.currentUses} <= ${table.maxUses})`),
  validityCheck: check("chk_promo_validity", sql`${table.validTo} >= ${table.validFrom}`),
}));

export const promoCodesRelations = relations(promoCodes, ({ one }) => ({
  event: one(events, {
    fields: [promoCodes.eventId],
    references: [events.id],
  }),
}));

// Refund table
export const refunds = pgTable("Refund", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("orderId").notNull().references(() => orders.id, { onDelete: "restrict" }),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  status: refundStatusEnum("status").notNull().default("PENDING"),
  stripeRefundId: varchar("stripeRefundId", { length: 255 }),
  processedBy: uuid("processedBy").references(() => users.id, { onDelete: "set null" }),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  processedByUser: one(users, {
    fields: [refunds.processedBy],
    references: [users.id],
  }),
}));

// Payout table
export const payouts = pgTable("Payout", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: uuid("organizerId").notNull().references(() => organizers.id, { onDelete: "restrict" }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  status: payoutStatusEnum("status").notNull().default("PENDING"),
  stripePayoutId: varchar("stripePayoutId", { length: 255 }),
  scheduledDate: timestamp("scheduledDate"),
  paidAt: timestamp("paidAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const payoutsRelations = relations(payouts, ({ one }) => ({
  organizer: one(organizers, {
    fields: [payouts.organizerId],
    references: [organizers.id],
  }),
}));
