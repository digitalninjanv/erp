import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { suppliers, locations, products } from "./inventory";

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  orderDate: timestamp("order_date", { withTimezone: true }).notNull(),
  expectedDate: timestamp("expected_date", { withTimezone: true }),
  status: text("status").notNull(), // "draft", "approved", "partially_received", "received", "cancelled", "closed"
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: text("id").primaryKey(),
  poId: text("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  qtyOrdered: numeric("qty_ordered", { precision: 12, scale: 2 }).notNull(),
  qtyReceived: numeric("qty_received", { precision: 12, scale: 2 }).default("0").notNull(),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

export const goodsReceipts = pgTable("goods_receipts", {
  id: text("id").primaryKey(),
  grNumber: text("gr_number").notNull().unique(),
  poId: text("po_id").references(() => purchaseOrders.id),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  locationId: text("location_id").notNull().references(() => locations.id),
  receivedDate: timestamp("received_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "draft", "posted", "reversed"
  notes: text("notes"),
  receivedBy: text("received_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: text("id").primaryKey(),
  goodsReceiptId: text("goods_receipt_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }),
  poItemId: text("po_item_id").references(() => purchaseOrderItems.id),
  productId: text("product_id").notNull().references(() => products.id),
  qtyReceived: numeric("qty_received", { precision: 12, scale: 2 }).notNull(),
  qtyDamaged: numeric("qty_damaged", { precision: 12, scale: 2 }).default("0").notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  subtotalCost: numeric("subtotal_cost", { precision: 14, scale: 2 }).notNull(),
});

export const supplierInvoices = pgTable("supplier_invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  goodsReceiptId: text("goods_receipt_id").references(() => goodsReceipts.id),
  poId: text("po_id").references(() => purchaseOrders.id),
  invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  status: text("status").notNull(), // "draft", "posted", "partially_paid", "paid", "cancelled"
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: text("id").primaryKey(),
  paymentNumber: text("payment_number").notNull().unique(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  invoiceId: text("invoice_id").notNull().references(() => supplierInvoices.id),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // "bank_transfer", "cash"
  bankAccountId: text("bank_account_id"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplierReturns = pgTable("supplier_returns", {
  id: text("id").primaryKey(),
  returnNumber: text("return_number").notNull().unique(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  goodsReceiptId: text("goods_receipt_id").references(() => goodsReceipts.id),
  returnDate: timestamp("return_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "draft", "approved", "completed"
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  resolutionType: text("resolution_type").notNull(), // "replacement", "credit_note", "refund"
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplierReturnItems = pgTable("supplier_return_items", {
  id: text("id").primaryKey(),
  supplierReturnId: text("supplier_return_id").notNull().references(() => supplierReturns.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

export const stockTransfers = pgTable("stock_transfers", {
  id: text("id").primaryKey(),
  transferNumber: text("transfer_number").notNull().unique(),
  fromLocationId: text("from_location_id").notNull().references(() => locations.id),
  toLocationId: text("to_location_id").notNull().references(() => locations.id),
  transferDate: timestamp("transfer_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "draft", "in_transit", "received", "cancelled"
  notes: text("notes"),
  createdBy: text("created_by"),
  receivedBy: text("received_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: text("id").primaryKey(),
  transferId: text("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
});

export const stocktakes = pgTable("stocktakes", {
  id: text("id").primaryKey(),
  stocktakeNumber: text("stocktake_number").notNull().unique(),
  locationId: text("location_id").notNull().references(() => locations.id),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "draft", "counting", "review", "approved", "posted"
  notes: text("notes"),
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stocktakeItems = pgTable("stocktake_items", {
  id: text("id").primaryKey(),
  stocktakeId: text("stocktake_id").notNull().references(() => stocktakes.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  systemQty: numeric("system_qty", { precision: 12, scale: 2 }).notNull(),
  physicalQty: numeric("physical_qty", { precision: 12, scale: 2 }).notNull(),
  varianceQty: numeric("variance_qty", { precision: 12, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull(),
  varianceAmount: numeric("variance_amount", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
});
