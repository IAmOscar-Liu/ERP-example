// src/repository/leave.repository.ts
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
import { db, leaveRequests, leaveTypes } from "../db";
import { CustomError } from "../lib/error";
import { PaginationQuery } from "../type/request";
import {
  createCompTimeTransaction,
  getCompTimeBalanceForEmployee,
} from "./compTime.repository";
import { EmployeeRow } from "./employee.repository";

export type LeaveTypeRow = typeof leaveTypes.$inferSelect;

export type LeaveRequestRow = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;

export async function listLeaveTypes() {
  return db.query.leaveTypes.findMany();
}

export interface LeaveFilter extends PaginationQuery {
  employeeId?: string;
  status?: LeaveRequestRow["status"];
  from?: Date;
  to?: Date;
}

export async function createLeaveRequest(payload: NewLeaveRequest) {
  // Check for overlapping approved leave requests for the same employee.
  const overlappingRequest = await db.query.leaveRequests.findFirst({
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
      "Leave request dates overlap with an existing approved or pending leave.",
      400
    );
  }

  // Check if the leave type is 'COMP' (compensatory time) and if the balance is sufficient.
  const leaveType = await db.query.leaveTypes.findFirst({
    where: (lt, { eq }) => eq(lt.id, payload.leaveTypeId),
  });

  if (leaveType?.code === "COMP") {
    const balance = await getCompTimeBalanceForEmployee(payload.employeeId);
    const requestedHours = Number(payload.hours);

    if (!Number.isFinite(requestedHours) || requestedHours <= 0) {
      throw new CustomError("Invalid hours for compensatory time leave.", 400);
    }

    const requestedMinutes = Math.round(requestedHours * 60);
    const availableMinutes = balance?.balanceMinutes ?? 0;

    if (availableMinutes < requestedMinutes) {
      throw new CustomError("Insufficient compensatory time balance.", 400);
    }
  }

  const [row] = await db.insert(leaveRequests).values(payload).returning();
  return row;
}

/**
 * 取得單一請假申請
 */
export async function getLeaveRequest(id: string): Promise<
  | (LeaveRequestRow & {
      employee: EmployeeRow;
      approver: EmployeeRow | null;
      leaveType: LeaveTypeRow;
    })
  | null
> {
  const row = await db.query.leaveRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      employee: true,
      approver: true,
      leaveType: true,
    },
  });

  return row ?? null;
}

/**
 * 更新請假申請（僅限 pending 狀態）
 */
export async function updateLeaveRequest(
  id: string,
  data: Partial<NewLeaveRequest>
): Promise<LeaveRequestRow | null> {
  const existing = await db.query.leaveRequests.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!existing) return null;

  if (existing.status !== "pending") {
    throw new CustomError("Only pending leave requests can be updated", 400);
  }

  // Check for overlapping approved leave requests for the same employee.
  const overlappingRequest = await db.query.leaveRequests.findFirst({
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
      "Leave request dates overlap with an existing approved or pending leave.",
      400
    );
  }

  const [updated] = await db
    .update(leaveRequests)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(leaveRequests.id, id))
    .returning();

  return updated ?? null;
}

export async function listLeaveRequests(filter: LeaveFilter = {}) {
  const { employeeId, status, from, to, page, limit } = filter;
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 10;
  const offset = (pageNumber - 1) * limitNumber;

  const whereClause = and(
    employeeId ? eq(leaveRequests.employeeId, employeeId) : undefined,
    status ? eq(leaveRequests.status, status) : undefined,
    from ? gte(leaveRequests.startAt, from) : undefined,
    to ? lte(leaveRequests.endAt, to) : undefined
  );

  const [data, totalResult] = await Promise.all([
    db.query.leaveRequests.findMany({
      where: whereClause,
      orderBy: (t, { desc }) => desc(t.startAt),
      with: {
        employee: true,
        leaveType: true,
      },
      limit: limitNumber,
      offset,
    }),
    db.select({ count: count() }).from(leaveRequests).where(whereClause),
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

export interface LeaveStatsFilter {
  employeeId?: string;
  status?: "draft" | "pending" | "approved" | "rejected" | "cancelled";
  from?: Date;
  to?: Date;
}

export async function getLeaveStatsForEmployee(filter: LeaveStatsFilter) {
  const { employeeId, status, from, to } = filter;

  const whereClause = and(
    employeeId ? eq(leaveRequests.employeeId, employeeId) : undefined,
    status ? eq(leaveRequests.status, status) : undefined,
    from ? gte(leaveRequests.startAt, from) : undefined,
    to ? lte(leaveRequests.startAt, to) : undefined
  );

  const result = await db
    .select({
      totalHours: sum(sql<number>`${leaveRequests.hours}::numeric`).mapWith(
        Number
      ),
    })
    .from(leaveRequests)
    .where(whereClause);

  const stats = result[0];

  return {
    // Use ?? 0 to handle cases where the sum is null (no matching records)
    totalHours: stats.totalHours ?? 0,
  };
}

export interface ReviewLeavePayload {
  leaveRequestId: string;
  approverEmployeeId: string;
  approve: boolean;
  decisionNote?: string;
}

export async function reviewLeaveRequest(
  payload: ReviewLeavePayload
): Promise<LeaveRequestRow | null> {
  const { leaveRequestId, approverEmployeeId, approve, decisionNote } = payload;

  // 1. 先把原請假單抓出來（含 leaveType，用來判斷是不是 COMP）
  const existing = await db.query.leaveRequests.findFirst({
    where: (t, { eq }) => eq(t.id, leaveRequestId),
    with: {
      leaveType: true,
    },
  });

  if (!existing) {
    throw new CustomError("Leave request not found", 404);
  }

  const status: LeaveRequestRow["status"] = approve ? "approved" : "rejected";

  // 2. 若要核准，且是假別為補休（COMP），先確認補休餘額是否足夠
  if (status === "approved" && existing.leaveType?.code === "COMP") {
    const balance = await getCompTimeBalanceForEmployee(existing.employeeId);

    const hoursNum = Number(existing.hours ?? "0");
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      throw new CustomError("Invalid leave hours for comp time", 400);
    }

    const neededMinutes = Math.round(hoursNum * 60);

    if ((balance?.balanceMinutes ?? 0) < neededMinutes) {
      throw new CustomError("Insufficient comp time balance", 400);
    }
  }

  // 3. 更新請假單狀態
  const [updated] = await db
    .update(leaveRequests)
    .set({
      status,
      approverEmployeeId,
      decisionNote,
      decidedAt: new Date(),
    })
    .where(eq(leaveRequests.id, leaveRequestId))
    .returning();

  if (!updated) {
    return null;
  }

  // 4. 若核准且為補休假（COMP），建立一筆補休「消耗」交易
  if (status === "approved" && existing.leaveType?.code === "COMP") {
    const hoursNum = Number(existing.hours ?? "0");
    const minutes = Math.round(hoursNum * 60);

    if (minutes > 0) {
      await createCompTimeTransaction({
        employeeId: existing.employeeId,
        type: "spend",
        minutes,
        occurredAt: existing.startAt, // 以請假起始日為扣除日
        leaveRequestId: existing.id,
        reason: `Comp time used for leave on ${existing.startAt
          .toISOString()
          .slice(0, 10)}`,
      });
    }
  }

  return updated;
}

export interface CancelLeavePayload {
  leaveRequestId: string;
  approverEmployeeId: string;
  decisionNote?: string;
}

export async function cancelLeaveRequest(payload: CancelLeavePayload) {
  const [updated] = await db
    .update(leaveRequests)
    .set({ ...payload, status: "cancelled" })
    .where(
      and(
        eq(leaveRequests.id, payload.leaveRequestId),
        eq(leaveRequests.status, "pending")
      )
    )
    .returning();

  return updated;
}
