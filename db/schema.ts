import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const evaluations = sqliteTable(
  "evaluations",
  {
    id: text("id").primaryKey(),
    employeeName: text("employee_name").notNull().default(""),
    employeeId: text("employee_id").notNull().default(""),
    period: text("period").notNull().default(""),
    payload: text("payload").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("evaluations_employee_id_idx").on(table.employeeId),
    index("evaluations_period_idx").on(table.period),
  ],
);
