// src/service/compTime.service.ts
import { handleServiceError } from "../lib/error";
import { ServiceResponse } from "../type/general";
import * as schema from "../db/schema";

import {
  getCompTimeBalanceForEmployee,
  listCompTimeTransactions,
  createCompTimeTransaction,
  CompTimeTxnFilter,
  NewCompTimeTransaction,
} from "../repository";

type CompTimeBalanceRow = typeof schema.compTimeBalances.$inferSelect;
type CompTimeTransactionRow = typeof schema.compTimeTransactions.$inferSelect;

class CompTimeService {
  /**
   * 查詢員工的補休餘額
   */
  async getBalance(
    employeeId: string
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof getCompTimeBalanceForEmployee>>>
  > {
    try {
      const bal = await getCompTimeBalanceForEmployee(employeeId);
      return { success: true, data: bal };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 查詢補休明細
   */
  async listTransactions(
    filter: CompTimeTxnFilter = {}
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listCompTimeTransactions>>>
  > {
    try {
      const rows = await listCompTimeTransactions(filter);
      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 建立補休交易（增加／扣除分鐘數）
   */
  async addTransaction(
    payload: NewCompTimeTransaction
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof createCompTimeTransaction>>>
  > {
    try {
      const txn = await createCompTimeTransaction(payload);

      return {
        success: true,
        data: txn,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 員工查自己的補休明細（wrapper）
   */
  async listForEmployee(
    employeeId: string,
    extra?: Omit<CompTimeTxnFilter, "employeeId">
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listCompTimeTransactions>>>
  > {
    try {
      const rows = await listCompTimeTransactions({
        employeeId,
        ...extra,
      });

      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }
}

export default new CompTimeService();
