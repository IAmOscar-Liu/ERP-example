import {
  attendanceStatusEnum,
  boolean,
  clockSourceEnum,
  date,
  index,
  integer,
  pgTable,
  requestStatusEnum,
  text,
  timestamp,
  timestamps,
  uniqueIndex,
  uuid,
  varchar,
} from "./core";
import { employees } from "./hr";
import { shiftTypes } from "./shift";

// ========== Attendance (Daily summary) ==========

export const attendanceDays = pgTable(
  "attendance_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    plannedShiftTypeId: uuid("planned_shift_type_id").references(
      () => shiftTypes.id,
      { onDelete: "set null" }
    ),

    firstInAt: timestamp("first_in_at", { withTimezone: true }),
    lastOutAt: timestamp("last_out_at", { withTimezone: true }),
    workMinutes: integer("work_minutes"),
    overtimeMinutes: integer("overtime_minutes"),
    status: attendanceStatusEnum("status").default("normal").notNull(),
    exceptionReason: text("exception_reason"),

    ...timestamps,
  },
  (table) => ({
    uniqEmployeeDate: uniqueIndex(
      "attendance_days_employee_id_work_date_uniq"
    ).on(table.employeeId, table.workDate),
    idxEmployeeDate: index("attendance_days_employee_id_work_date_idx").on(
      table.employeeId,
      table.workDate
    ),
  })
);

// ========== Attendance Corrections ==========

export const attendanceCorrections = pgTable("attendance_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  workDate: date("work_date").notNull(),

  attendanceDayId: uuid("attendance_day_id").references(
    () => attendanceDays.id,
    { onDelete: "set null" }
  ),

  originalFirstInAt: timestamp("original_first_in_at", { withTimezone: true }),
  originalLastOutAt: timestamp("original_last_out_at", {
    withTimezone: true,
  }),

  requestedFirstInAt: timestamp("requested_first_in_at", {
    withTimezone: true,
  }),
  requestedLastOutAt: timestamp("requested_last_out_at", {
    withTimezone: true,
  }),

  reason: text("reason").notNull(),
  status: requestStatusEnum("status").default("pending").notNull(),
  approverEmployeeId: uuid("approver_employee_id").references(
    () => employees.id,
    { onDelete: "set null" }
  ),
  decisionNote: text("decision_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),

  ...timestamps,
});

// ========== Time Clock Records ==========

export const timeClockRecords = pgTable("time_clock_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  attendanceDayId: uuid("attendance_day_id").references(
    () => attendanceDays.id,
    { onDelete: "set null" }
  ),

  clockAt: timestamp("clock_at", { withTimezone: true }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // "in" | "out"
  source: clockSourceEnum("source").default("web").notNull(),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  isManual: boolean("is_manual").default(false).notNull(),

  correctionId: uuid("correction_id").references(
    () => attendanceCorrections.id,
    { onDelete: "set null" }
  ),

  ...timestamps,
});
