import { relations } from "drizzle-orm";
import {
  attendanceCorrections,
  attendanceDays,
  employees,
  shiftSchedules,
  shiftTypes,
  timeClockRecords,
} from "../schema";

// 班別 ↔ 排班 / 出勤
export const shiftTypesRelations = relations(shiftTypes, ({ many }) => ({
  shiftSchedules: many(shiftSchedules),
  attendanceDays: many(attendanceDays),
}));

// 排班 ↔ 員工 / 班別
export const shiftSchedulesRelations = relations(shiftSchedules, ({ one }) => ({
  employee: one(employees, {
    fields: [shiftSchedules.employeeId],
    references: [employees.id],
  }),
  shiftType: one(shiftTypes, {
    fields: [shiftSchedules.shiftTypeId],
    references: [shiftTypes.id],
  }),
}));

// 打卡紀錄 ↔ 員工 / 出勤日 / 補卡
export const timeClockRecordsRelations = relations(
  timeClockRecords,
  ({ one }) => ({
    employee: one(employees, {
      fields: [timeClockRecords.employeeId],
      references: [employees.id],
    }),
    attendanceDay: one(attendanceDays, {
      fields: [timeClockRecords.attendanceDayId],
      references: [attendanceDays.id],
    }),
    correction: one(attendanceCorrections, {
      fields: [timeClockRecords.correctionId],
      references: [attendanceCorrections.id],
      relationName: "correctionTimeRecords",
    }),
  })
);

// 每日出勤 ↔ 員工 / 班別 / 打卡 / 補卡
export const attendanceDaysRelations = relations(
  attendanceDays,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [attendanceDays.employeeId],
      references: [employees.id],
    }),
    plannedShiftType: one(shiftTypes, {
      fields: [attendanceDays.plannedShiftTypeId],
      references: [shiftTypes.id],
    }),
    timeClockRecords: many(timeClockRecords),
    attendanceCorrections: many(attendanceCorrections),
  })
);

// 補卡申請 ↔ 員工 / 審核者 / 出勤日 / 相關打卡
export const attendanceCorrectionsRelations = relations(
  attendanceCorrections,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [attendanceCorrections.employeeId],
      references: [employees.id],
      relationName: "requester",
    }),
    approver: one(employees, {
      fields: [attendanceCorrections.approverEmployeeId],
      references: [employees.id],
      relationName: "approver",
    }),
    attendanceDay: one(attendanceDays, {
      fields: [attendanceCorrections.attendanceDayId],
      references: [attendanceDays.id],
    }),
    timeClockRecords: many(timeClockRecords, {
      relationName: "correctionTimeRecords",
    }),
  })
);
