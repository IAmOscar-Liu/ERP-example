import {
  boolean,
  date,
  integer,
  pgTable,
  requestStatusEnum,
  shiftChangeTypeEnum,
  text,
  time,
  timestamp,
  timestamps,
  uuid,
  varchar,
} from "./core";
import { employees } from "./hr";

// ========== Shift Types & Schedules ==========

export const shiftTypes = pgTable("shift_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  breakMinutes: integer("break_minutes").default(60).notNull(),
  isNightShift: boolean("is_night_shift").default(false).notNull(),
  color: varchar("color", { length: 20 }),
  ...timestamps,
});

export const shiftSchedules = pgTable("shift_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  workDate: date("work_date").notNull(),
  shiftTypeId: uuid("shift_type_id")
    .notNull()
    .references(() => shiftTypes.id, { onDelete: "restrict" }),
  isLocked: boolean("is_locked").default(false).notNull(),
  note: text("note"),
  ...timestamps,
});

export const shiftChangeRequests = pgTable("shift_change_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: shiftChangeTypeEnum("type").notNull(),
  requesterEmployeeId: uuid("requester_employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  fromEmployeeId: uuid("from_employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  fromWorkDate: date("from_work_date").notNull(),
  fromShiftTypeId: uuid("from_shift_type_id")
    .notNull()
    .references(() => shiftTypes.id, { onDelete: "restrict" }),

  toEmployeeId: uuid("to_employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  toWorkDate: date("to_work_date").notNull(),
  toShiftTypeId: uuid("to_shift_type_id")
    .notNull()
    .references(() => shiftTypes.id, { onDelete: "restrict" }),

  status: requestStatusEnum("status").default("pending").notNull(),
  approverEmployeeId: uuid("approver_employee_id").references(
    () => employees.id,
    { onDelete: "set null" }
  ),
  reason: text("reason"),
  decisionNote: text("decision_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  ...timestamps,
});
