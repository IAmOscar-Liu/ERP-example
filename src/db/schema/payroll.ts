import {
  boolean,
  date,
  jsonb,
  numeric,
  payrollItemTypeEnum,
  pgTable,
  requestStatusEnum,
  text,
  timestamps,
  uuid,
  varchar,
} from "./core";
import { employees } from "./hr";

export const payrollItemDefs = pgTable("payroll_item_defs", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: payrollItemTypeEnum("type").notNull(),
  defaultAmount: numeric("default_amount", { precision: 10, scale: 2 }),
  taxable: boolean("taxable").default(true).notNull(),
  config: jsonb("config"),
  ...timestamps,
});

export const payrollPreviews = pgTable("payroll_previews", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  baseSalary: numeric("base_salary", { precision: 12, scale: 2 }),
  status: requestStatusEnum("status").default("draft").notNull(),
  payDate: date("pay_date"),
  note: text("note"),
  ...timestamps,
});

export const payrollPreviewItems = pgTable("payroll_preview_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  payrollPreviewId: uuid("payroll_preview_id")
    .notNull()
    .references(() => payrollPreviews.id, { onDelete: "cascade" }),
  itemDefId: uuid("item_def_id").references(() => payrollItemDefs.id, {
    onDelete: "set null",
  }),
  nameSnapshot: varchar("name_snapshot", { length: 255 }).notNull(),
  type: payrollItemTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  source: jsonb("source"),
  ...timestamps,
});
