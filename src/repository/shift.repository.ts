// src/repository/shift.ts

import { and, eq } from "drizzle-orm";
import { db, shiftChangeRequests, shiftSchedules, shiftTypes } from "../db";
import * as schema from "../db/schema";

export type ShiftTypeRow = typeof schema.shiftTypes.$inferSelect;
export type NewShiftType = typeof schema.shiftTypes.$inferInsert;

export type ShiftScheduleRow = typeof schema.shiftSchedules.$inferSelect;
export type ShiftChangeRequestRow =
  typeof schema.shiftChangeRequests.$inferSelect;

// ==============================
// Shift Types & Schedules
// ==============================

export async function listShiftTypes() {
  return db.query.shiftTypes.findMany({
    orderBy: (t, { asc }) => asc(t.code),
  });
}

export async function createShiftType(input: typeof shiftTypes.$inferInsert) {
  const [row] = await db.insert(shiftTypes).values(input).returning();
  return row;
}

export async function updateShiftType(
  id: string,
  input: Partial<typeof shiftTypes.$inferInsert>
) {
  const [row] = await db
    .update(shiftTypes)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(shiftTypes.id, id))
    .returning();
  return row;
}

// ------------------------------
// shift schedules
// ------------------------------

export async function getShiftSchedules({
  employeeId,
  fromDate,
  toDate,
}: {
  employeeId?: string;
  fromDate: string;
  toDate: string;
}) {
  return db.query.shiftSchedules.findMany({
    where: (t, { and, eq, gte, lte }) => {
      const conds: any[] = [gte(t.workDate, fromDate), lte(t.workDate, toDate)];
      if (employeeId) conds.push(eq(t.employeeId, employeeId));
      return and(...conds);
    },
    orderBy: (t, { asc }) => asc(t.workDate),
    with: {
      employee: true,
      shiftType: true,
    },
  });
}

export interface UpsertShiftScheduleInput {
  employeeId: string;
  workDate: string; // YYYY-MM-DD
  shiftTypeId: string;
  isLocked?: boolean;
  note?: string | null;
}

export async function upsertShiftSchedule({
  employeeId,
  workDate,
  shiftTypeId,
  isLocked = false,
  note = null,
}: {
  employeeId: string;
  workDate: string;
  shiftTypeId: string;
  isLocked?: boolean;
  note?: string | null;
}) {
  const existing = await db.query.shiftSchedules.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.employeeId, employeeId), eq(t.workDate, workDate)),
  });

  if (existing) {
    const [row] = await db
      .update(shiftSchedules)
      .set({
        shiftTypeId,
        isLocked,
        note,
        updatedAt: new Date(),
      })
      .where(eq(shiftSchedules.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(shiftSchedules)
    .values({
      employeeId,
      workDate,
      shiftTypeId,
      isLocked,
      note,
    })
    .returning();
  return row;
}

// ------------------------------
// Shift Change Requests
// ------------------------------

export async function listShiftChangeRequests({
  employeeId,
  status,
}: {
  employeeId?: string;
  status?: "pending" | "approved" | "rejected";
}) {
  return db.query.shiftChangeRequests.findMany({
    where: (t, { and, or, eq }) => {
      const conds: any[] = [];
      if (employeeId) {
        conds.push(
          or(
            eq(t.requesterEmployeeId, employeeId),
            eq(t.fromEmployeeId, employeeId),
            eq(t.toEmployeeId, employeeId)
          )
        );
      }
      if (status) conds.push(eq(t.status, status));
      return conds.length ? and(...conds) : undefined;
    },
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
}

export interface CreateShiftChangeInput {
  type: "swap" | "cover";
  requesterEmployeeId: string;
  fromEmployeeId: string;
  fromWorkDate: string; // YYYY-MM-DD
  fromShiftTypeId: string;
  toEmployeeId: string;
  toWorkDate: string; // YYYY-MM-DD
  toShiftTypeId: string;
  reason?: string | null;
}

export async function createShiftChangeRequest(input: CreateShiftChangeInput) {
  const [row] = await db
    .insert(shiftChangeRequests)
    .values({ ...input, status: "pending" })
    .returning();
  return row;
}

export interface ReviewShiftChangeInput {
  requestId: string;
  approverEmployeeId: string;
  approve: boolean;
  decisionNote?: string;
}

// 審核調班/代班申請（核准 / 駁回，同時調整排班）
export async function reviewShiftChangeRequest(
  payload: ReviewShiftChangeInput
): Promise<ShiftChangeRequestRow | null> {
  const { requestId, approverEmployeeId, approve, decisionNote } = payload;

  // 1. 先把原始申請資料抓出來
  const existing = await db.query.shiftChangeRequests.findFirst({
    where: (t, { eq }) => eq(t.id, requestId),
  });

  if (!existing) {
    return null;
  }

  const status: ShiftChangeRequestRow["status"] = approve
    ? "approved"
    : "rejected";

  // 2. 若核准 → 依 type 調整 shiftSchedules
  if (approve) {
    // 互調班：A/B 交換班
    if (existing.type === "swap") {
      // ---- from side ----
      const fromSchedule = await db.query.shiftSchedules.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.employeeId, existing.fromEmployeeId),
            eq(t.workDate, existing.fromWorkDate)
          ),
      });

      if (fromSchedule) {
        // 原本 A 的班 → 改成 B 上
        await db
          .update(shiftSchedules)
          .set({
            employeeId: existing.toEmployeeId,
            shiftTypeId: existing.fromShiftTypeId,
            updatedAt: new Date(),
          })
          .where(eq(shiftSchedules.id, fromSchedule.id));
      } else {
        // 沒有資料就幫 B 建一筆
        await db.insert(shiftSchedules).values({
          employeeId: existing.toEmployeeId,
          workDate: existing.fromWorkDate,
          shiftTypeId: existing.fromShiftTypeId,
        } as typeof shiftSchedules.$inferInsert);
      }

      // ---- to side ----
      const toSchedule = await db.query.shiftSchedules.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.employeeId, existing.toEmployeeId),
            eq(t.workDate, existing.toWorkDate)
          ),
      });

      if (toSchedule) {
        // 原本 B 的班 → 改成 A 上
        await db
          .update(shiftSchedules)
          .set({
            employeeId: existing.fromEmployeeId,
            shiftTypeId: existing.toShiftTypeId,
            updatedAt: new Date(),
          })
          .where(eq(shiftSchedules.id, toSchedule.id));
      } else {
        // 沒有資料就幫 A 建一筆
        await db.insert(shiftSchedules).values({
          employeeId: existing.fromEmployeeId,
          workDate: existing.toWorkDate,
          shiftTypeId: existing.toShiftTypeId,
        } as typeof shiftSchedules.$inferInsert);
      }
    }

    // 代班：B 來幫 A 上 fromWorkDate / fromShiftTypeId
    if (existing.type === "cover") {
      const fromSchedule = await db.query.shiftSchedules.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.employeeId, existing.fromEmployeeId),
            eq(t.workDate, existing.fromWorkDate)
          ),
      });

      if (fromSchedule) {
        // 直接把這班改成 B 上
        await db
          .update(shiftSchedules)
          .set({
            employeeId: existing.toEmployeeId,
            updatedAt: new Date(),
          })
          .where(eq(shiftSchedules.id, fromSchedule.id));
      } else {
        // 沒班但申請代班 → 幫 B 製造一班
        await db.insert(shiftSchedules).values({
          employeeId: existing.toEmployeeId,
          workDate: existing.fromWorkDate,
          shiftTypeId: existing.fromShiftTypeId,
        } as typeof shiftSchedules.$inferInsert);
      }
    }
  }

  // 3. 最後更新申請本身的狀態
  const [row] = await db
    .update(shiftChangeRequests)
    .set({
      status,
      approverEmployeeId,
      decisionNote: decisionNote ?? null,
      decidedAt: new Date(),
    })
    .where(eq(shiftChangeRequests.id, requestId))
    .returning();

  return row ?? null;
}
