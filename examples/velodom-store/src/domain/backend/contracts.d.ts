/**
 * ----------------------------------------
 * Module: Store Application HTTP Contracts
 * ----------------------------------------
 *
 * Describes the example's public wire values for JS JSDoc and optional TS
 * consumers. These app-owned types add no runtime validation or framework API.
 * The backend remains responsible for validating every untrusted input.
 * ----------------------------------------
 */

import type { AuthSessionPayload, RequestContext } from "velodom";

/** The only facts persisted by the guest cart. */
export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

/** A backend-resolved option with authoritative availability and prices. */
export interface StoreQuoteLine extends CartLine {
  name: string;
  variantLabel: string;
  stock: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

/** A mock backend quotation, with monetary values in integer minor units. */
export interface StoreQuote {
  currency: "USD";
  lines: StoreQuoteLine[];
  itemCount: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  taxRateBps: number;
  quotedAt: string;
  mock: true;
  authoritative: true;
}

/** Public session facts, never the HttpOnly session cookie or signing secret. */
export type StoreSession = {
  authenticated: false;
  user: null;
  roles: string[];
} | {
  authenticated: true;
  user: { id: string; name: string; tenantId: string; roles: string[] };
  roles: string[];
  csrfToken: string;
  expiresAt: string;
};

/** Browser-visible order status; no payment provider is contacted. */
export interface StoreOrder {
  id: string;
  status: "pending-mock";
  paymentStatus: "not-charged";
  quote: StoreQuote;
  createdAt: string;
  message?: string;
}

/** Optional input for an authoritative quote, including an empty guest cart. */
export interface QuoteInput {
  lines?: CartLine[];
  currency?: string;
}

/** An intentional write, checked again by the backend before acceptance. */
export interface CreateOrderInput {
  lines: CartLine[];
  currency: string;
  expectedTotalCents: number;
  idempotencyKey: string;
}

/** Ordinary query inputs; dynamic URL values remain untrusted at runtime. */
export interface StoreQueryInput {
  params?: { id?: string };
  [key: string]: unknown;
}

/** Public framework request context extended with application session facts. */
export interface StoreRequestContext extends RequestContext {
  session?: AuthSessionPayload & { raw?: StoreSession };
}
