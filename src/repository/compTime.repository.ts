// src/repository/compTime.repository.ts
import { eq } from "drizzle-orm";
import { CustomError } from "../lib/error";
import {
  compTimeBalances,
  compTimeTransactions,
  db,
  employees,
  leaveRequests,
  overtimeRequests,
} from "../db";

export type CompTimeBalanceRow = typeof compTimeBalances.$inferSelect;
export type CompTimeBalanceInsert = typeof compTimeBalances.$inferInsert;

export type CompTimeTransactionRow = typeof compTimeTransactions.$inferSelect;
export type NewCompTimeTransaction = typeof compTimeTransactions.$inferInsert;

export interface CompTimeTxnFilter {
  employeeId?: string;
  type?: CompTimeTransactionRow["type"]; // "earn" | "spend" | "adjust"
  from?: Date; // occurredAt >= from
  to?: Date; // occurredAt <= to
}

/**
 * 查詢單一員工的補休餘額
 */
export async function getCompTimeBalanceForEmployee(
  employeeId: string
): Promise<CompTimeBalanceRow | null> {
  const row = await db.query.compTimeBalances.findFirst({
    where: (t, { eq }) => eq(t.employeeId, employeeId),
  });
  return row ?? null;
}

/**
 * 查詢補休明細列表
 */
export async function listCompTimeTransactions(
  filter: CompTimeTxnFilter = {}
): Promise<
  (CompTimeTransactionRow & {
    employee?: typeof employees.$inferSelect;
    overtimeRequest?: typeof overtimeRequests.$inferSelect | null;
    leaveRequest?: typeof leaveRequests.$inferSelect | null;
  })[]
> {
  const { employeeId, type, from, to } = filter;

  return db.query.compTimeTransactions.findMany({
    where: (t, helpers) => {
      const conds: any[] = [];

      if (employeeId) conds.push(helpers.eq(t.employeeId, employeeId));
      if (type) conds.push(helpers.eq(t.type, type as any));
      if (from) conds.push(helpers.gte(t.occurredAt, from));
      if (to) conds.push(helpers.lte(t.occurredAt, to));

      if (conds.length === 0) return undefined as any;
      return helpers.and(...conds);
    },
    orderBy: (t, { desc }) => desc(t.occurredAt),
    with: {
      employee: true,
      overtimeRequest: true,
      leaveRequest: true,
    },
  });
}

/**
 * 建立補休交易，並同步更新 compTimeBalances
 * - type: "earn"  → 增加分鐘數
 * - type: "spend" → 減少分鐘數
 * - type: "adjust"→ 直接加上 payload.minutes（可正可負）
 *
 * 回傳 { transaction, balance }，方便 service 使用
 */
export async function createCompTimeTransaction(
  payload: NewCompTimeTransaction
): Promise<{
  transaction: CompTimeTransactionRow;
  balance: CompTimeBalanceRow;
}> {
  const { employeeId, type, minutes } = payload;

  // 決定對餘額的變化量
  let delta = minutes;

  if (type === "earn") {
    delta = Math.abs(minutes);
  } else if (type === "spend") {
    delta = -Math.abs(minutes);
  } else if (type === "adjust") {
    // 直接照 minutes（可正可負）
    delta = minutes;
  }

  return db.transaction(async (tx) => {
    // 1) 建立交易
    const [txn] = await tx
      .insert(compTimeTransactions)
      .values(payload)
      .returning();

    // 2) 更新 / 建立餘額
    let balance = await tx.query.compTimeBalances.findFirst({
      where: (t, { eq }) => eq(t.employeeId, employeeId),
    });

    if (!balance) {
      const [inserted] = await tx
        .insert(compTimeBalances)
        .values({
          employeeId,
          balanceMinutes: delta,
        })
        .returning();
      balance = inserted;
    } else {
      const newBalance = (balance.balanceMinutes ?? 0) + delta;
      if (newBalance < 0) {
        throw new CustomError("Insufficient compensatory time balance.", 400);
      }

      const [updated] = await tx
        .update(compTimeBalances)
        .set({
          balanceMinutes: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(compTimeBalances.id, balance.id))
        .returning();
      balance = updated;
    }

    return {
      transaction: txn,
      balance,
    };
  });
}
