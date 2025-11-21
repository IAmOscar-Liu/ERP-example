// relations/leave.relations.ts
import { relations } from "drizzle-orm";
import {
  compTimeTransactions,
  employees,
  leaveRequests,
  leaveTypes,
} from "../schema"; // ← 依你的實際路徑調整

// ====================== Leave Types ======================

// 假別 ↔ 請假單
export const leaveTypesRelations = relations(leaveTypes, ({ many }) => ({
  leaveRequests: many(leaveRequests),
}));

// ====================== Leave Requests ======================

// 請假單 ↔ 員工 / 假別 / 審核者 / 補休交易
export const leaveRequestsRelations = relations(
  leaveRequests,
  ({ one, many }) => ({
    // 申請人
    employee: one(employees, {
      fields: [leaveRequests.employeeId],
      references: [employees.id],
    }),

    // 假別
    leaveType: one(leaveTypes, {
      fields: [leaveRequests.leaveTypeId],
      references: [leaveTypes.id],
    }),

    // 審核者（主管）
    approver: one(employees, {
      fields: [leaveRequests.approverEmployeeId],
      references: [employees.id],
    }),

    // 此請假單所衍生的補休交易（例如用補休抵銷）
    compTimeTransactions: many(compTimeTransactions),
  })
);
