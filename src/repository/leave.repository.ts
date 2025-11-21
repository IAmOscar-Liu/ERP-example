// src/repository/leave.repository.ts
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db, leaveRequests, leaveTypes } from "../db";
import { CustomError } from "../lib/error";
import { EmployeeRow } from "./employee.repository";
import {
  createCompTimeTransaction,
  getCompTimeBalanceForEmployee,
} from "./compTime.repository";

export type LeaveTypeRow = typeof leaveTypes.$inferSelect;

export type LeaveRequestRow = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;

export async function listLeaveTypes() {
  return db.query.leaveTypes.findMany();
}

export interface LeaveFilter {
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
  const { employeeId, status, from, to } = filter;
  return db.query.leaveRequests.findMany({
    where: (t, { and, eq, gte, lte }) => {
      const conditions: any[] = [];
      if (employeeId) conditions.push(eq(t.employeeId, employeeId));
      if (status) conditions.push(eq(t.status, status as any));
      if (from) conditions.push(gte(t.startAt, from));
      if (to) conditions.push(lte(t.endAt, to));
      if (conditions.length === 0) return undefined as any;
      return and(...conditions);
    },
    orderBy: (t, { desc }) => desc(t.startAt),
    with: {
      employee: true,
      leaveType: true,
    },
  });
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
