// src/repository/attendance.ts

import { eq } from "drizzle-orm";
import {
  attendanceCorrections,
  attendanceDays,
  db,
  timeClockRecords,
} from "../db";
import { toDateOnlyString } from "../lib/general";

// ==============================
// 型別定義
// ==============================

export type ClockDirection = "in" | "out";

export interface ClockPayload {
  employeeId: string;
  direction: ClockDirection;
  clockAt?: Date; // 不給就用現在時間
  source?: "web" | "mobile" | "manual";
  ipAddress?: string;
  userAgent?: string;
}

export interface AttendanceQueryByEmployee {
  employeeId: string;
  fromDate?: string; // "YYYY-MM-DD"
  toDate?: string; // "YYYY-MM-DD"
}

export interface DailyAttendanceByDeptQuery {
  workDate: string; // "YYYY-MM-DD"
  departmentId?: string; // 不給則全部部門
}

export interface CreateCorrectionPayload {
  employeeId: string;
  workDate: string; // "YYYY-MM-DD"
  requestedFirstInAt?: Date;
  requestedLastOutAt?: Date;
  reason: string;
}

export interface ReviewCorrectionPayload {
  correctionId: string;
  approverEmployeeId: string;
  approve: boolean;
  decisionNote?: string;
}

// ==============================
// Helpers
// ==============================

// ==============================
// Repository 主要功能
// ==============================

/**
 * 打卡（in/out）
 * - 會 upsert 對應的 attendance_days
 * - 寫入 time_clock_records
 * - 重算當日出勤 summary
 */
export async function clock(payload: ClockPayload) {
  const now = payload.clockAt ?? new Date();
  const workDate = toDateOnlyString(now, process.env.COMPANY_TIMEZONE);

  // 1. 取得或建立當天的 attendance_day
  let day = await db.query.attendanceDays.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.employeeId, payload.employeeId), eq(t.workDate, workDate)),
  });

  if (!day) {
    const inserted = await db
      .insert(attendanceDays)
      .values({
        employeeId: payload.employeeId,
        workDate,
      })
      .returning();
    day = inserted[0];
  }

  // 2. 寫入打卡紀錄
  await db.insert(timeClockRecords).values({
    employeeId: payload.employeeId,
    attendanceDayId: day.id,
    clockAt: now,
    direction: payload.direction,
    source: payload.source ?? "web",
    ipAddress: payload.ipAddress,
    userAgent: payload.userAgent,
    isManual: payload.source === "manual" ? true : false,
  });

  // 3. 重算當日出勤
  await recomputeAttendanceDay(payload.employeeId, workDate);
}

/**
 * 重算某員工某天的出勤 summary
 * - 依該天所有 time_clock_records 的 in/out，更新
 *   firstInAt / lastOutAt / workMinutes / status
 * - 目前先不處理跨日與 break，之後可再加邏輯
 */
export async function recomputeAttendanceDay(
  employeeId: string,
  workDate: string
) {
  const day = await db.query.attendanceDays.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.employeeId, employeeId), eq(t.workDate, workDate)),
    with: {
      timeClockRecords: true,
      plannedShiftType: true,
    },
  });

  if (!day) return;

  const records = [...day.timeClockRecords].sort(
    (a, b) => a.clockAt.getTime() - b.clockAt.getTime()
  );

  const firstIn = records.find((r) => r.direction === "in")?.clockAt ?? null;
  const lastOut =
    [...records].reverse().find((r) => r.direction === "out")?.clockAt ?? null;

  let workMinutes: number | null = null;

  if (firstIn && lastOut) {
    workMinutes = Math.round(
      (lastOut.getTime() - firstIn.getTime()) / (1000 * 60)
    );
  }

  // 簡單版 status，之後可依排班時間算遲到 / 早退 / 缺勤等
  let status: (typeof attendanceDays.$inferSelect)["status"] = "normal";

  if (!firstIn && !lastOut) {
    status = "absent";
  } else if (!firstIn || !lastOut) {
    status = "exception";
  }

  await db
    .update(attendanceDays)
    .set({
      firstInAt: firstIn,
      lastOutAt: lastOut,
      workMinutes,
      status,
      updatedAt: new Date(),
    })
    .where(eq(attendanceDays.id, day.id));
}

/**
 * 查某員工一段期間的出勤列表
 * - 帶出 plannedShiftType
 */
export async function getAttendanceDaysForEmployee(
  query: AttendanceQueryByEmployee
) {
  const { employeeId, fromDate, toDate } = query;

  return db.query.attendanceDays.findMany({
    where: (t, { and, eq, gte, lte }) => {
      const conditions: any[] = [eq(t.employeeId, employeeId)];
      if (fromDate) conditions.push(gte(t.workDate, fromDate));
      if (toDate) conditions.push(lte(t.workDate, toDate));
      return and(...conditions);
    },
    orderBy: (t, { desc }) => desc(t.workDate),
    with: {
      plannedShiftType: true,
    },
  });
}

/**
 * 查某天出勤列表（可限制部門）
 * - 帶出 employee + department + position + plannedShiftType
 * - 用於出勤列表頁 / 搜尋
 */
export async function listDailyAttendanceByDepartment(
  query: DailyAttendanceByDeptQuery
) {
  const { workDate, departmentId } = query;

  return db.query.attendanceDays
    .findMany({
      where: (t, { and, eq }) => {
        const conditions: any[] = [eq(t.workDate, workDate)];
        if (departmentId) {
          // department 條件要在 join 條件裡，這裡簡單先用 with 過濾（會在程式層 filter）
          // 若要 SQL 層處理可以用 db.select/from join 的寫法。
          return eq(t.workDate, workDate);
        }
        return and(...conditions);
      },
      orderBy: (t, { asc }) => asc(t.employeeId),
      with: {
        employee: {
          with: {
            department: true,
            position: true,
          },
        },
        plannedShiftType: true,
      },
    })
    .then((rows) => {
      if (!departmentId) return rows;
      return rows.filter((r) => r.employee.departmentId === departmentId);
    });
}

/**
 * 建立補卡申請
 * - 只寫入 attendance_corrections
 * - 真正的打卡紀錄調整在核准時進行
 */
export async function createCorrectionRequest(
  payload: CreateCorrectionPayload
) {
  const {
    employeeId,
    workDate,
    requestedFirstInAt,
    requestedLastOutAt,
    reason,
  } = payload;

  // 找現有的 attendance_day（可能還沒建立）
  const day = await db.query.attendanceDays.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.employeeId, employeeId), eq(t.workDate, workDate)),
  });

  const [inserted] = await db
    .insert(attendanceCorrections)
    .values({
      employeeId,
      workDate,
      attendanceDayId: day?.id,
      originalFirstInAt: day?.firstInAt ?? null,
      originalLastOutAt: day?.lastOutAt ?? null,
      requestedFirstInAt: requestedFirstInAt ?? null,
      requestedLastOutAt: requestedLastOutAt ?? null,
      reason,
      status: "pending",
    })
    .returning();

  return inserted;
}

/**
 * 審核補卡申請
 * - approve: true 則依核准時間寫入打卡紀錄並重算出勤
 * - approve: false 則只更新狀態與 decisionNote
 */
export async function reviewCorrectionRequest(
  payload: ReviewCorrectionPayload
) {
  const { correctionId, approverEmployeeId, approve, decisionNote } = payload;

  const correction = await db.query.attendanceCorrections.findFirst({
    where: (t, { eq }) => eq(t.id, correctionId),
  });

  if (!correction) {
    throw new Error("Correction request not found");
  }

  const status = approve ? "approved" : "rejected";

  // 更新補卡申請狀態
  await db
    .update(attendanceCorrections)
    .set({
      status,
      approverEmployeeId,
      decisionNote,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendanceCorrections.id, correctionId));

  if (!approve) {
    // 駁回不用動打卡紀錄
    return;
  }

  // 核准：依 requestedFirstInAt / requestedLastOutAt 寫入或更新打卡紀錄
  const workDate = correction.workDate;
  const employeeId = correction.employeeId;

  // 確保有 attendance_day
  let day = await db.query.attendanceDays.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.employeeId, employeeId), eq(t.workDate, workDate)),
  });

  if (!day) {
    const [insertedDay] = await db
      .insert(attendanceDays)
      .values({
        employeeId,
        workDate,
      })
      .returning();
    day = insertedDay;
  }

  // 這裡採簡單策略：
  // - 不刪原有紀錄，只新增 manual + correctionId 的紀錄（方便稽核）
  // - 之後 recomputeAttendanceDay 會用「最早 in / 最晚 out」來算
  const manualRecords: (typeof timeClockRecords.$inferInsert)[] = [];

  if (correction.requestedFirstInAt) {
    manualRecords.push({
      employeeId,
      attendanceDayId: day.id,
      clockAt: correction.requestedFirstInAt,
      direction: "in",
      source: "manual",
      isManual: true,
      correctionId: correction.id,
    });
  }

  if (correction.requestedLastOutAt) {
    manualRecords.push({
      employeeId,
      attendanceDayId: day.id,
      clockAt: correction.requestedLastOutAt,
      direction: "out",
      source: "manual",
      isManual: true,
      correctionId: correction.id,
    });
  }

  if (manualRecords.length > 0) {
    await db.insert(timeClockRecords).values(manualRecords);
  }

  await recomputeAttendanceDay(employeeId, workDate);
}

// ==============================
// 查詢補卡申請（列表用）
// ==============================

export async function listCorrectionsForEmployee(employeeId: string) {
  return db.query.attendanceCorrections.findMany({
    where: (t, { eq }) => eq(t.employeeId, employeeId),
    orderBy: (t, { desc }) => desc(t.createdAt),
    with: {
      attendanceDay: true,
      employee: true,
      approver: true,
    },
  });
}

export async function listPendingCorrectionsForApprover(
  approverEmployeeId: string
) {
  // 這裡示範查所有 pending，實務上可根據「這個 approver 是哪些人的主管」來過濾
  return db.query.attendanceCorrections.findMany({
    where: (t, { eq }) => eq(t.status, "pending"),
    orderBy: (t, { asc }) => asc(t.workDate),
    with: {
      employee: {
        with: {
          department: true,
          position: true,
        },
      },
      attendanceDay: true,
    },
  });
}
