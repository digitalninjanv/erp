import { pgTable, text, timestamp, boolean, numeric, uniqueIndex } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "PCS", "BOX", "DUS", "KG", "LITER"
  name: text("name").notNull(),
  description: text("description"),
});

export const locations = pgTable("locations", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "STORE-01", "WH-MAIN", "DAMAGED", "QUARANTINE"
  name: text("name").notNull(),
  type: text("type").notNull(), // "store", "warehouse", "damaged", "quarantine", "transit"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  termDays: numeric("term_days", { precision: 5, scale: 0 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  groupName: text("group_name").default("Umum").notNull(), // "Umum", "Member", "Grosir"
  phone: text("phone"),
  email: text("email"),
  creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).default("0").notNull(),
  currentDebt: numeric("current_debt", { precision: 14, scale: 2 }).default("0").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customerGroups = pgTable("customer_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  description: text("description"),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  categoryId: text("category_id").references(() => categories.id),
  baseUnitId: text("base_unit_id").references(() => units.id),
  purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }).default("0").notNull(),
  costPrice: numeric("cost_price", { precision: 14, scale: 2 }).default("0").notNull(), // Moving Weighted Average
  sellingPrice: numeric("selling_price", { precision: 14, scale: 2 }).default("0").notNull(),
  minStock: numeric("min_stock", { precision: 12, scale: 2 }).default("0").notNull(),
  brand: text("brand"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productBarcodes = pgTable("product_barcodes", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  barcode: text("barcode").notNull().unique(), // leading-zero preserved!
  isPrimary: boolean("is_primary").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const unitConversions = pgTable("unit_conversions", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  fromUnitId: text("from_unit_id").notNull().references(() => units.id),
  toUnitId: text("to_unit_id").notNull().references(() => units.id),
  multiplier: numeric("multiplier", { precision: 12, scale: 4 }).notNull(), // e.g. 1 Box = 24 Pcs
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stockBalances = pgTable("stock_balances", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  qty: numeric("qty", { precision: 12, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("stock_balance_prod_loc_idx").on(t.productId, t.locationId)
]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  locationId: text("location_id").notNull().references(() => locations.id),
  refType: text("ref_type").notNull(), // "goods_receipt", "sale", "sale_return", "transfer_out", "transfer_in", "stocktake_adj", "damage_write_off"
  refId: text("ref_id").notNull(),
  qtyChange: numeric("qty_change", { precision: 12, scale: 2 }).notNull(), // can be positive or negative
  costPerUnit: numeric("cost_per_unit", { precision: 14, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
