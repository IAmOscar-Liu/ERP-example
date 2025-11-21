// db/relations/compTime.relations.ts
import { relations } from "drizzle-orm";
import {
  compTimeBalances,
  compTimeTransactions,
  employees,
  overtimeRequests,
  leaveRequests,
} from "../schema";

// 補休餘額 ↔ 員工
export const compTimeBalancesRelations = relations(
  compTimeBalances,
  ({ one }) => ({
    employee: one(employees, {
      fields: [compTimeBalances.employeeId],
      references: [employees.id],
    }),
  })
);

// 補休交易 ↔ 員工 / 來源加班單 / 來源請假單
export const compTimeTransactionsRelations = relations(
  compTimeTransactions,
  ({ one }) => ({
    employee: one(employees, {
      fields: [compTimeTransactions.employeeId],
      references: [employees.id],
    }),

    // 由哪張加班單產生（earn）
    overtimeRequest: one(overtimeRequests, {
      fields: [compTimeTransactions.overtimeRequestId],
      references: [overtimeRequests.id],
    }),

    // 由哪張請假單消耗（spend）
    leaveRequest: one(leaveRequests, {
      fields: [compTimeTransactions.leaveRequestId],
      references: [leaveRequests.id],
    }),
  })
);
