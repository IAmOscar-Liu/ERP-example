// db/relations/overtime.relations.ts
import { relations } from "drizzle-orm";
import { overtimeRequests, employees, compTimeTransactions } from "../schema";

// 加班申請 ↔ 員工 / 審核者 / 補休交易
export const overtimeRequestsRelations = relations(
  overtimeRequests,
  ({ one, many }) => ({
    // 申請人
    employee: one(employees, {
      fields: [overtimeRequests.employeeId],
      references: [employees.id],
    }),

    // 審核者（主管）
    approver: one(employees, {
      fields: [overtimeRequests.approverEmployeeId],
      references: [employees.id],
    }),

    // 若有 convertToCompTime，產生的補休交易會參考這張加班單
    compTimeTransactions: many(compTimeTransactions),
  })
);
