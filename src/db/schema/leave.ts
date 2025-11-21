import {
  pgTable,
  uuid,
  varchar,
  date,
  timestamp,
  integer,
  numeric,
  text,
  boolean,
  jsonb,
  timestamps,
} from "./core";
import {
  leaveTypeCategoryEnum,
  requestStatusEnum,
  compTimeTxnTypeEnum,
} from "./core";
import { employees } from "./hr";

export const leaveTypes = pgTable("leave_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: leaveTypeCategoryEnum("category").default("other").notNull(),
  withPay: boolean("with_pay").default(true).notNull(),
  requiresProof: boolean("requires_proof").default(false).notNull(),
  config: jsonb("config"),
  ...timestamps,
});

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  leaveTypeId: uuid("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id, { onDelete: "restrict" }),

  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),

  reason: text("reason"),
  status: requestStatusEnum("status").default("pending").notNull(),
  approverEmployeeId: uuid("approver_employee_id").references(
    () => employees.id,
    { onDelete: "set null" }
  ),
  decisionNote: text("decision_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),

  attachments: jsonb("attachments"),
  ...timestamps,
});

export const overtimeRequests = pgTable("overtime_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  workDate: date("work_date").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  plannedHours: numeric("planned_hours", { precision: 6, scale: 2 }).notNull(),
  approvedHours: numeric("approved_hours", { precision: 6, scale: 2 }),
  reason: text("reason"),

  status: requestStatusEnum("status").default("pending").notNull(),
  approverEmployeeId: uuid("approver_employee_id").references(
    () => employees.id,
    { onDelete: "set null" }
  ),
  decisionNote: text("decision_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),

  convertToCompTime: boolean("convert_to_comp_time").default(false).notNull(),
  ...timestamps,
});

export const compTimeBalances = pgTable("comp_time_balances", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .unique()
    .references(() => employees.id, { onDelete: "cascade" }),
  balanceMinutes: integer("balance_minutes").default(0).notNull(),
  ...timestamps,
});

export const compTimeTransactions = pgTable("comp_time_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  type: compTimeTxnTypeEnum("type").notNull(),
  minutes: integer("minutes").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),

  overtimeRequestId: uuid("overtime_request_id").references(
    () => overtimeRequests.id,
    { onDelete: "set null" }
  ),
  leaveRequestId: uuid("leave_request_id").references(
    () => leaveRequests.id,
    { onDelete: "set null" }
  ),
  reason: text("reason"),
  ...timestamps,
});
