// Global type definitions for EasyTix platform

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "CUSTOMER" | "ORGANIZER" | "ADMIN";
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organizer {
  id: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  stripeAccountId?: string;
  stripeOnboarded: boolean;
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "PAST_DUE";
  subscriptionEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  publishedAt?: Date;
  coverImage?: string;
  images: string[];
  isFree: boolean;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  organizer?: Organizer;
  ticketTiers?: TicketTier[];
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  basePrice: number;
  platformMarkup: number;
  platformFee: number;
  totalQuantity: number;
  soldQuantity: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  subtotal: number;
  platformFees: number;
  promoDiscount: number;
  total: number;
  currency: string;
  stripePaymentIntentId?: string;
  paymentStatus: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  paidAt?: Date;
  promoCodeId?: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerFirstName: string;
  buyerLastName: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  event?: Event;
  items?: OrderItem[];
  tickets?: Ticket[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
  platformFee: number;
  subtotal: number;
  createdAt: Date;
  ticketTier?: TicketTier;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  orderId: string;
  eventId: string;
  ticketTierId: string;
  userId: string;
  originalUserId: string;
  status: "VALID" | "SCANNED" | "CANCELLED" | "REFUNDED";
  scannedAt?: Date;
  scannedBy?: string;
  transferredAt?: Date;
  transferredFrom?: string;
  transferredTo?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: Order;
  event?: Event;
  ticketTier?: TicketTier;
  user?: User;
}

export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConfig {
  id: string;
  defaultPlatformFeePercent: number;
  defaultPlatformFeeFixed: number;
  defaultPlatformMarkupPercent: number;
  freeEventMonthlyFee: number;
  minTicketPrice: number;
  maxTicketPrice: number;
  maxTicketsPerOrder: number;
  payoutDelayHours: number;
  minimumPayoutAmount: number;
  allowTransfers: boolean;
  allowPromoCodes: boolean;
  allowGroupDiscounts: boolean;
  requireOrganizerApproval: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  version: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EventPricingOverride {
  id: string;
  eventId: string;
  platformFeePercent?: number;
  platformFeeFixed?: number;
  platformMarkupPercent?: number;
  reason?: string;
  approvedBy: string;
  createdAt: Date;
}

export interface Admin {
  id: string;
  userId: string;
  role: "SUPER_ADMIN" | "FINANCE_ADMIN" | "SUPPORT_ADMIN" | "CONTENT_ADMIN";
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  user?: User;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  createdAt: Date;
  admin?: Admin;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form validation types
export interface FormError {
  field: string;
  message: string;
}

// Checkout types
export interface CheckoutItem {
  ticketTierId: string;
  quantity: number;
}

export interface CheckoutCalculation {
  subtotal: number;
  platformFees: number;
  promoDiscount: number;
  total: number;
  breakdown: {
    tierName: string;
    quantity: number;
    unitPrice: number;
    platformFee: number;
    subtotal: number;
  }[];
}

// Scanner types
export interface TicketValidationResult {
  valid: boolean;
  ticket?: {
    id: string;
    ticketNumber: string;
    eventTitle: string;
    tierName: string;
    buyerName: string;
    status: string;
  };
  error?: string;
  message: string;
}