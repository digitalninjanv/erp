import { pgTable, text, timestamp, boolean, numeric, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { customers, locations, products } from "./inventory";

export const posShifts = pgTable("pos_shifts", {
  id: text("id").primaryKey(),
  shiftNumber: text("shift_number").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id),
  locationId: text("location_id").notNull().references(() => locations.id),
  openingCash: numeric("opening_cash", { precision: 14, scale: 2 }).default("0").notNull(),
  closingCashActual: numeric("closing_cash_actual", { precision: 14, scale: 2 }),
  closingCashExpected: numeric("closing_cash_expected", { precision: 14, scale: 2 }),
  variance: numeric("variance", { precision: 14, scale: 2 }),
  status: text("status").notNull(), // "open", "closed"
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow().notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posCashMovements = pgTable("pos_cash_movements", {
  id: text("id").primaryKey(),
  shiftId: text("shift_id").notNull().references(() => posShifts.id, { onDelete: "cascade" }),
  movementType: text("movement_type").notNull(), // "cash_in", "cash_out", "deposit"
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: text("id").primaryKey(),
  saleNumber: text("sale_number").notNull().unique(),
  shiftId: text("shift_id").references(() => posShifts.id),
  customerId: text("customer_id").references(() => customers.id),
  locationId: text("location_id").notNull().references(() => locations.id),
  saleDate: timestamp("sale_date", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").notNull(), // "draft", "awaiting_payment", "posted", "voided", "cancelled"
  paymentStatus: text("payment_status").notNull(), // "unpaid", "pending_verification", "partially_paid", "paid", "partially_refunded", "refunded"
  fulfillmentStatus: text("fulfillment_status").notNull(), // "not_required", "pending", "reserved", "picking", "ready", "dispatched", "delivered", "completed"
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  roundingAmount: numeric("rounding_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  changeAmount: numeric("change_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  paymentMethod: text("payment_method").notNull(), // "cash", "qris_static", "split", "credit"
  isOfflineSynced: boolean("is_offline_synced").default(false).notNull(),
  offlineIdempotencyKey: text("offline_idempotency_key"),
  notes: text("notes"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const saleItems = pgTable("sale_items", {
  id: text("id").primaryKey(),
  saleId: text("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  skuSnapshot: text("sku_snapshot").notNull(),
  nameSnapshot: text("name_snapshot").notNull(),
  unitSnapshot: text("unit_snapshot").notNull(),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  qtyReturned: numeric("qty_returned", { precision: 12, scale: 2 }).default("0").notNull(),
});

export const salePayments = pgTable("sale_payments", {
  id: text("id").primaryKey(),
  saleId: text("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
  shiftId: text("shift_id").references(() => posShifts.id),
  paymentMethod: text("payment_method").notNull(), // "cash", "qris_static", "bank_transfer", "credit"
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date", { withTimezone: true }).defaultNow().notNull(),
  referenceNumber: text("reference_number"),
  verifiedBy: text("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  status: text("status").notNull(), // "completed", "pending_verification", "refunded"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const posHeldCarts = pgTable("pos_held_carts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  customerId: text("customer_id").references(() => customers.id),
  label: text("label").notNull(),
  cartData: jsonb("cart_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesReturns = pgTable("sales_returns", {
  id: text("id").primaryKey(),
  returnNumber: text("return_number").notNull().unique(),
  saleId: text("sale_id").notNull().references(() => sales.id),
  returnDate: timestamp("return_date", { withTimezone: true }).defaultNow().notNull(),
  status: text("status").notNull(), // "draft", "posted"
  totalRefundAmount: numeric("total_refund_amount", { precision: 14, scale: 2 }).notNull(),
  refundMethod: text("refund_method").notNull(), // "cash", "bank_transfer", "store_credit"
  reason: text("reason").notNull(),
  approvedBy: text("approved_by"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const salesReturnItems = pgTable("sales_return_items", {
  id: text("id").primaryKey(),
  returnId: text("return_id").notNull().references(() => salesReturns.id, { onDelete: "cascade" }),
  saleItemId: text("sale_item_id").notNull().references(() => saleItems.id),
  productId: text("product_id").notNull().references(() => products.id),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
  condition: text("condition").notNull(), // "saleable", "damaged"
  refundAmount: numeric("refund_amount", { precision: 14, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
});

export const paymentMethodsConfig = pgTable("payment_methods_config", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // "cash", "qris_static", "bca", "mandiri"
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  instructions: text("instructions"),
  imageUrl: text("image_url"),
  clearingAccountId: text("clearing_account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
