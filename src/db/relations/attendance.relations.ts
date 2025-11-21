import { relations } from "drizzle-orm";
import {
  users,
  employees,
  departments,
  positions,
  timeClockRecords,
  attendanceDays,
  attendanceCorrections,
  shiftSchedules,
} from "../schema";

// 部門 ↔ 員工
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  headEmployee: one(employees, {
    fields: [departments.headEmployeeId],
    references: [employees.id],
  }),
  employees: many(employees),
}));

// 職位 ↔ 員工
export const positionsRelations = relations(positions, ({ many }) => ({
  employees: many(employees),
}));

// 員工 ↔ 使用者 / 部門 / 職位 / 上下屬 / 出勤相關
export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  position: one(positions, {
    fields: [employees.positionId],
    references: [positions.id],
  }),

  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
    relationName: "manager",
  }),
  subordinates: many(employees, {
    relationName: "manager",
  }),

  shiftSchedules: many(shiftSchedules),
  timeClockRecords: many(timeClockRecords),
  attendanceDays: many(attendanceDays),

  attendanceCorrectionsRequested: many(attendanceCorrections, {
    relationName: "requester",
  }),
  attendanceCorrectionsApproved: many(attendanceCorrections, {
    relationName: "approver",
  }),
}));
