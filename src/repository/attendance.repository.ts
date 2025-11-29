// src/repository/attendance.ts

import { and, count, eq, gte, lte, not, sql, sum } from "drizzle-orm";
import {
  attendanceCorrections,
  attendanceDays,
  db,
  timeClockRecords,
} from "../db";
import { toDateOnlyString } from "../lib/general";
import { PaginationQuery } from "../type/request";

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

export interface AttendanceQueryByEmployee extends PaginationQuery {
  employeeId?: string;
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
  const workDate = toDateOnlyString(now);

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
  const { employeeId, fromDate, toDate, page, limit } = query;
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 10;
  const offset = (pageNumber - 1) * limitNumber;

  const whereClause = and(
    employeeId ? eq(attendanceDays.employeeId, employeeId) : undefined,
    fromDate ? gte(attendanceDays.workDate, fromDate) : undefined,
    toDate ? lte(attendanceDays.workDate, toDate) : undefined
  );

  const [data, totalResult] = await Promise.all([
    db.query.attendanceDays.findMany({
      where: whereClause,
      orderBy: (t, { desc }) => desc(t.workDate),
      with: {
        plannedShiftType: true,
        employee: true,
      },
      limit: limitNumber,
      offset,
    }),
    db.select({ count: count() }).from(attendanceDays).where(whereClause),
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
export interface AttendanceStatsQueryByEmployee {
  employeeId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * 查詢某員工一段期間的出勤統計
 * - totalWorkdays: 出勤天數（狀態非缺勤）
 * - totalWorkHours: 總工時（分鐘轉小時）
 */
export async function getAttendanceStatsForEmployee(
  query: AttendanceStatsQueryByEmployee
) {
  const { employeeId, fromDate, toDate } = query;

  const whereClause = and(
    employeeId ? eq(attendanceDays.employeeId, employeeId) : undefined,
    fromDate ? gte(attendanceDays.workDate, fromDate) : undefined,
    toDate ? lte(attendanceDays.workDate, toDate) : undefined
  );

  const statsResult = await db
    .select({
      totalWorkdays: count(attendanceDays.id),
      totalWorkMinutes: sum(attendanceDays.workMinutes).mapWith(Number),
    })
    .from(attendanceDays)
    .where(and(whereClause, not(eq(attendanceDays.status, "absent"))));

  const stats = statsResult[0];

  // Convert total minutes to hours, rounded to 2 decimal places
  const totalWorkHours = stats.totalWorkMinutes
    ? parseFloat((stats.totalWorkMinutes / 60).toFixed(2))
    : 0;

  return {
    totalWorkdays: stats.totalWorkdays,
    totalWorkHours,
  };
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

export async function listCorrectionsForEmployee(
  employeeId: string,
  query: PaginationQuery
) {
  const { page, limit } = query;
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 10;
  const offset = (pageNumber - 1) * limitNumber;

  const whereClause = eq(attendanceCorrections.employeeId, employeeId);

  const [data, totalResult] = await Promise.all([
    db.query.attendanceCorrections.findMany({
      where: whereClause,
      orderBy: (t, { desc }) => desc(t.createdAt),
      limit: limitNumber,
      offset,
      with: {
        attendanceDay: true,
        employee: true,
        approver: true,
      },
    }),
    db
      .select({ count: count() })
      .from(attendanceCorrections)
      .where(whereClause),
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

export async function listPendingCorrectionsForApprover(
  approverEmployeeId: string,
  query: PaginationQuery
) {
  const { page, limit } = query;
  const pageNumber = page ?? 1;
  const limitNumber = limit ?? 10;
  const offset = (pageNumber - 1) * limitNumber;

  // 這裡示範查所有 pending，實務上可根據「這個 approver 是哪些人的主管」來過濾
  const whereClause = eq(attendanceCorrections.status, "pending");

  const [data, totalResult] = await Promise.all([
    db.query.attendanceCorrections.findMany({
      where: whereClause,
      orderBy: (t, { asc }) => asc(t.workDate),
      limit: limitNumber,
      offset,
      with: {
        employee: {
          with: {
            department: true,
            position: true,
          },
        },
        attendanceDay: true,
      },
    }),
    db
      .select({ count: count() })
      .from(attendanceCorrections)
      .where(whereClause),
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
