import { z } from "zod";

/**
 * Validation schema for event creation
 */
export const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long").trim(),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description too long").trim(),
  venue: z.string().min(1, "Venue is required").max(255, "Venue name too long"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  startDate: z.string().datetime("Invalid start date"),
  endDate: z.string().datetime("Invalid end date"),
  timezone: z.string().default("America/New_York"),
  category: z.enum([
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
  ]),
  coverImage: z.string().url("Invalid cover image URL").optional(),
  images: z.array(z.string().url()).optional(),
  isFree: z.boolean().default(false),
  ticketTiers: z.array(
    z.object({
      name: z.string().min(1, "Tier name required").max(100, "Tier name too long"),
      description: z.string().max(500, "Description too long").optional(),
      basePrice: z.number().int().min(0, "Price cannot be negative").max(1000000, "Price too high"),
      totalQuantity: z.number().int().min(1, "Must have at least 1 ticket").max(100000, "Quantity too high"),
      sortOrder: z.number().int().min(0).default(0),
    })
  ).min(1, "At least one ticket tier required"),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: "End date must be after start date",
    path: ["endDate"],
  }
);

/**
 * Validation schema for promo code creation
 */
export const createPromoCodeSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(50, "Code too long").toUpperCase(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().min(1, "Discount must be at least 1"),
  maxUses: z.number().int().min(1).optional().nullable(),
  validFrom: z.string().datetime("Invalid date"),
  validTo: z.string().datetime("Invalid date"),
}).refine(
  (data) => {
    if (data.discountType === "PERCENTAGE") {
      return data.discountValue >= 1 && data.discountValue <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount must be between 1 and 100",
    path: ["discountValue"],
  }
).refine(
  (data) => new Date(data.validTo) > new Date(data.validFrom),
  {
    message: "Valid to date must be after valid from date",
    path: ["validTo"],
  }
);

/**
 * Validation schema for checkout
 */
export const checkoutSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  userId: z.string().uuid("Invalid user ID"),
  email: z.string().email("Invalid email address").optional(),
  promoCode: z.string().max(50).optional(),
  tickets: z.array(
    z.object({
      tierId: z.string().uuid("Invalid tier ID"),
      quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Cannot purchase more than 50 tickets at once"),
    })
  ).min(1, "At least one ticket required"),
}).refine(
  (data) => {
    const totalQuantity = data.tickets.reduce((sum, t) => sum + t.quantity, 0);
    return totalQuantity <= 100;
  },
  {
    message: "Cannot purchase more than 100 total tickets in one order",
    path: ["tickets"],
  }
);

/**
 * Validation schema for user registration
 */
export const registerSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
  firstName: z.string().min(1, "First name required").max(100, "First name too long").trim(),
  lastName: z.string().min(1, "Last name required").max(100, "Last name too long").trim(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional(),
  role: z.enum(["CUSTOMER", "ORGANIZER"]).default("CUSTOMER"),
});

/**
 * Validation schema for ticket transfer
 */
export const transferTicketSchema = z.object({
  recipientEmail: z.string().email("Invalid email address"),
  recipientName: z.string().min(2, "Name must be at least 2 characters").max(200, "Name too long"),
});

/**
 * Validation schema for refund
 */
export const refundSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(1000, "Reason too long").optional(),
  amount: z.number().int().min(1, "Amount must be positive").optional(),
});
