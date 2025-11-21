import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  numeric,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";

// ========== Enums ==========

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contractor",
  "intern",
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "onboarding",
  "suspended",
  "terminated",
]);

export const shiftChangeTypeEnum = pgEnum("shift_change_type", [
  "swap",
  "cover",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "normal",
  "late",
  "early_leave",
  "absent",
  "exception",
]);

export const clockSourceEnum = pgEnum("clock_source", [
  "web",
  "mobile",
  "manual",
]);

export const leaveTypeCategoryEnum = pgEnum("leave_type_category", [
  "annual",
  "sick",
  "personal",
  "unpaid",
  "other",
]);

export const compTimeTxnTypeEnum = pgEnum("comp_time_txn_type", [
  "earn",
  "spend",
  "adjust",
]);

export const payrollItemTypeEnum = pgEnum("payroll_item_type", [
  "earning",
  "deduction",
]);

// ========== Common helpers ==========

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

// Re-export core pg types so other schema files can just import from "./core"
export {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  time,
  timestamp,
  numeric,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
};
