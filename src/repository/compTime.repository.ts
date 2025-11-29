// src/repository/compTime.repository.ts
import { and, count, eq, gte, lte } from "drizzle-orm";
import { CustomError } from "../lib/error";
import { PaginationQuery } from "../type/request";
import { compTimeBalances, compTimeTransactions, db } from "../db";

export type CompTimeBalanceRow = typeof compTimeBalances.$inferSelect;
export type CompTimeBalanceInsert = typeof compTimeBalances.$inferInsert;

export type CompTimeTransactionRow = typeof compTimeTransactions.$inferSelect;
export type NewCompTimeTransaction = typeof compTimeTransactions.$inferInsert;

export interface CompTimeTxnFilter extends PaginationQuery {
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
export async function listCompTimeTransactions(filter: CompTimeTxnFilter = {}) {
  const { employeeId, type, from, to, page, limit } = filter;
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 10;
  const offset = (pageNumber - 1) * limitNumber;

  const whereClause = and(
    employeeId ? eq(compTimeTransactions.employeeId, employeeId) : undefined,
    type ? eq(compTimeTransactions.type, type) : undefined,
    from ? gte(compTimeTransactions.occurredAt, from) : undefined,
    to ? lte(compTimeTransactions.occurredAt, to) : undefined
  );

  const [data, totalResult] = await Promise.all([
    db.query.compTimeTransactions.findMany({
      where: whereClause,
      orderBy: (t, { desc }) => desc(t.occurredAt),
      with: {
        employee: true,
        overtimeRequest: true,
        leaveRequest: true,
      },
      limit: limitNumber,
      offset,
    }),
    db.select({ count: count() }).from(compTimeTransactions).where(whereClause),
  ]);

  const total = totalResult[0].count;
  const totalPages = Math.ceil(total / limitNumber);

  return {
    items: data,
    total,
    page: pageNumber,
    limit: limitNumber,
    totalPages,
  };
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
