// src/repository/overtime.repository.ts
import {
  and,
  count,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  not,
  sql,
  sum,
} from "drizzle-orm";
import { db, overtimeRequests } from "../db";
import { CustomError } from "../lib/error";
import { PaginationQuery } from "../type/request";
import { createCompTimeTransaction } from "./compTime.repository";
import { EmployeeRow } from "./employee.repository";

export type OvertimeRequestRow = typeof overtimeRequests.$inferSelect;
export type NewOvertimeRequest = typeof overtimeRequests.$inferInsert;

export interface OvertimeFilter extends PaginationQuery {
  employeeId?: string;
  status?: OvertimeRequestRow["status"];
  from?: Date; // filter by startAt >= from
  to?: Date; // filter by endAt <= to
}

/**
 * 建立加班申請
 */
export async function createOvertimeRequest(
  payload: NewOvertimeRequest
): Promise<OvertimeRequestRow> {
  // Check for overlapping approved leave requests for the same employee.
  const overlappingRequest = await db.query.overtimeRequests.findFirst({
    where: (lr) =>
      and(
        eq(lr.employeeId, payload.employeeId),
        inArray(lr.status, ["approved", "pending"]),
        // Overlap condition: (new_start <= old_end) AND (new_end >= old_start)
        lt(lr.startAt, payload.endAt),
        gt(lr.endAt, payload.startAt)
      ),
  });

  if (overlappingRequest) {
    throw new CustomError(
      "Overtime request dates overlap with an existing approved or pending leave.",
      400
    );
  }

  const [row] = await db.insert(overtimeRequests).values(payload).returning();
  return row;
}

/**
 * 取得單一加班申請
 */
export async function getOvertimeRequest(id: string): Promise<
  | (OvertimeRequestRow & {
      employee: EmployeeRow;
      approver: EmployeeRow | null;
    })
  | null
> {
  const row = await db.query.overtimeRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      employee: true,
      approver: true,
    },
  });

  return row ?? null;
}

/**
 * 更新加班單（僅限 pending 狀態）
 */
export async function updateOvertimeRequest(
  id: string,
  data: Partial<NewOvertimeRequest>
): Promise<OvertimeRequestRow | null> {
  // 查詢舊資料
  const existing = await db.query.overtimeRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!existing) return null;

  // 僅 pending 可以更新
  if (existing.status !== "pending") {
    throw new Error("Only pending overtime requests can be updated");
  }

  // Check for overlapping approved leave requests for the same employee.
  const overlappingRequest = await db.query.overtimeRequests.findFirst({
    where: (lr) =>
      and(
        not(eq(lr.id, existing.id)),
        eq(lr.employeeId, existing.employeeId),
        inArray(lr.status, ["approved", "pending"]),
        // Overlap condition: (new_start <= old_end) AND (new_end >= old_start)
        lt(lr.startAt, data.endAt ?? existing.endAt),
        gt(lr.endAt, data.startAt ?? existing.startAt)
      ),
  });

  if (overlappingRequest) {
    throw new CustomError(
      "Overtime request dates overlap with an existing approved or pending leave.",
      400
    );
  }

  const [updated] = await db
    .update(overtimeRequests)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(overtimeRequests.id, id))
    .returning();

  return updated ?? null;
}

/**
 * 查詢加班申請列表（可依員工 / 狀態 / 起迄時間過濾）
 */
export async function listOvertimeRequests(filter: OvertimeFilter = {}) {
  const { employeeId, status, from, to, page, limit } = filter;
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 10;
  const offset = (pageNumber - 1) * limitNumber;

  const whereClause = and(
    employeeId ? eq(overtimeRequests.employeeId, employeeId) : undefined,
    status ? eq(overtimeRequests.status, status) : undefined,
    from ? gte(overtimeRequests.startAt, from) : undefined,
    to ? lte(overtimeRequests.endAt, to) : undefined
  );

  const [data, totalResult] = await Promise.all([
    db.query.overtimeRequests.findMany({
      where: whereClause,
      orderBy: (t, { desc }) => desc(t.startAt),
      with: {
        employee: true,
      },
      limit: limitNumber,
      offset,
    }),
    db.select({ count: count() }).from(overtimeRequests).where(whereClause),
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

export interface OvertimeStatsFilter {
  employeeId?: string;
  status?: "draft" | "pending" | "approved" | "rejected" | "cancelled";
  from?: Date;
  to?: Date;
}

export async function getOvertimeStatsForEmployee(filter: OvertimeStatsFilter) {
  const { employeeId, status, from, to } = filter;

  const whereClause = and(
    employeeId ? eq(overtimeRequests.employeeId, employeeId) : undefined,
    status ? eq(overtimeRequests.status, status) : undefined,
    from
      ? gte(overtimeRequests.workDate, from.toISOString().slice(0, 10))
      : undefined,
    to
      ? lte(overtimeRequests.workDate, to.toISOString().slice(0, 10))
      : undefined
  );

  const result = await db
    .select({
      totalPlannedHours: sum(
        sql<number>`${overtimeRequests.plannedHours}::numeric`
      ).mapWith(Number),
      totalApprovedHours: sum(
        sql<number>`${overtimeRequests.approvedHours}::numeric`
      ).mapWith(Number),
    })
    .from(overtimeRequests)
    .where(whereClause);

  const stats = result[0];

  return {
    totalPlannedHours: stats.totalPlannedHours ?? 0,
    totalApprovedHours: stats.totalApprovedHours ?? 0,
  };
}

export interface ReviewOvertimePayload {
  overtimeRequestId: string;
  approverEmployeeId: string;
  approve: boolean;
  decisionNote?: string;
  approvedHours?: number | null;
  convertToCompTime?: boolean;
}

/**
 * 審核加班申請（核准 / 駁回）
 */
export async function reviewOvertimeRequest(
  payload: ReviewOvertimePayload
): Promise<OvertimeRequestRow | null> {
  const {
    overtimeRequestId,
    approverEmployeeId,
    approve,
    decisionNote,
    approvedHours,
    convertToCompTime,
  } = payload;

  // 1. 先取出原加班單
  const existing = await db.query.overtimeRequests.findFirst({
    where: (t, { eq }) => eq(t.id, overtimeRequestId),
  });

  if (!existing) {
    throw new CustomError("Overtime request not found", 400);
  }

  // 2. 若要批准，需檢查 approvedHours <= plannedHours
  if (approve) {
    if (approvedHours == null || isNaN(Number(approvedHours))) {
      throw new CustomError(
        "approvedHours is required when approving overtime",
        400
      );
    }

    const approved = Number(approvedHours);
    const planned = Number(existing.plannedHours);

    if (approved > planned) {
      throw new CustomError(
        `approvedHours (${approved}) cannot exceed plannedHours (${planned})`,
        400
      );
    }
  }

  const status: OvertimeRequestRow["status"] = approve
    ? "approved"
    : "rejected";

  // 3. 更新加班單
  const [updated] = await db
    .update(overtimeRequests)
    .set({
      status,
      approverEmployeeId,
      decisionNote,
      decidedAt: new Date(),
      approvedHours:
        typeof approvedHours === "number"
          ? approvedHours.toFixed(2)
          : approvedHours === null
          ? null
          : undefined,
      ...(convertToCompTime !== undefined ? { convertToCompTime } : {}),
    })
    .where(
      and(
        eq(overtimeRequests.id, overtimeRequestId),
        eq(overtimeRequests.status, "pending")
      )
    )
    .returning();

  if (!updated) return null;

  // 4. 若核准 + convertToCompTime → 建立補休 earn
  if (updated.status === "approved" && updated.convertToCompTime) {
    const approvedMinutes = updated.approvedHours
      ? Math.round(Number(updated.approvedHours) * 60)
      : null;

    if (approvedMinutes && approvedMinutes > 0) {
      const occurredAt = new Date(updated.workDate); // 加班日期

      await createCompTimeTransaction({
        employeeId: updated.employeeId,
        type: "earn",
        minutes: approvedMinutes,
        occurredAt,
        overtimeRequestId: updated.id,
        reason: `Overtime approved on ${updated.workDate}`,
      });
    }
  }

  return updated ?? null;
}

export interface CancelOvertimePayload {
  overtimeRequestId: string;
  approverEmployeeId: string;
  decisionNote?: string;
}

export async function cancelOvertimeRequest(payload: CancelOvertimePayload) {
  const [updated] = await db
    .update(overtimeRequests)
    .set({ ...payload, status: "cancelled" })
    .where(
      and(
        eq(overtimeRequests.id, payload.overtimeRequestId),
        eq(overtimeRequests.status, "pending")
      )
    )
    .returning();

  return updated;
}
