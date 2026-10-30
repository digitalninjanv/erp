import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  pin: text("pin"),
  isActive: boolean("is_active").default(true).notNull(),
  assignedLocationId: text("assigned_location_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(), // e.g. "pos.sell", "inventory.receive"
  module: text("module").notNull(), // "pos", "inventory", "accounting", "admin"
  description: text("description").notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});

export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  module: text("module").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const idempotencyRecords = pgTable("idempotency_records", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  scope: text("scope").notNull(), // e.g. "checkout", "sync_receipt"
  resourceId: text("resource_id"),
  responsePayload: jsonb("response_payload"),
  status: text("status").notNull(), // "completed", "failed", "processing"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
