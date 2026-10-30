import { pgTable, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { users } from "./identity";

export const migrationJobs = pgTable("migration_jobs", {
  id: text("id").primaryKey(),
  jobName: text("job_name").notNull(),
  entityType: text("entity_type").notNull(), // "products", "customers", "suppliers", "accounts", "opening_balances"
  fileName: text("file_name").notNull(),
  totalRows: numeric("total_rows", { precision: 10, scale: 0 }).default("0").notNull(),
  validRows: numeric("valid_rows", { precision: 10, scale: 0 }).default("0").notNull(),
  errorRows: numeric("error_rows", { precision: 10, scale: 0 }).default("0").notNull(),
  duplicateRows: numeric("duplicate_rows", { precision: 10, scale: 0 }).default("0").notNull(),
  importedRows: numeric("imported_rows", { precision: 10, scale: 0 }).default("0").notNull(),
  status: text("status").notNull(), // "uploaded", "parsed", "mapped", "dry_run_passed", "approved", "importing", "completed", "failed"
  mappingConfig: jsonb("mapping_config"),
  logDetails: jsonb("log_details"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
