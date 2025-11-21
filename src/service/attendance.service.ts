import { handleServiceError } from "../lib/error";
import { ServiceResponse } from "../type/general";
import {
  clock as clockRepo,
  recomputeAttendanceDay,
  getAttendanceDaysForEmployee,
  listDailyAttendanceByDepartment,
  createCorrectionRequest,
  reviewCorrectionRequest,
  listCorrectionsForEmployee,
  listPendingCorrectionsForApprover,
  ClockPayload,
  AttendanceQueryByEmployee,
  DailyAttendanceByDeptQuery,
  CreateCorrectionPayload,
  ReviewCorrectionPayload,
} from "../repository";

/**
 * 你也可以從 schema 拿型別，不過這裡直接用 ReturnType 從 repository 推導，
 * 跟 AuthService.createAccount 的寫法一致。
 */

class AttendanceService {
  /**
   * 打卡（in/out）
   */
  async clock(input: ClockPayload): Promise<ServiceResponse<null>> {
    try {
      await clockRepo(input);
      return { success: true, data: null };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 重新計算某員工某天的出勤 summary
   * （一般不會直接給 API 用，但留著方便管理後台）
   */
  async recomputeDay(
    employeeId: string,
    workDate: string
  ): Promise<ServiceResponse<null>> {
    try {
      await recomputeAttendanceDay(employeeId, workDate);
      return { success: true, data: null };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 查某員工在一段期間的出勤
   */
  async getEmployeeAttendance(
    query: AttendanceQueryByEmployee
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof getAttendanceDaysForEmployee>>>
  > {
    try {
      const days = await getAttendanceDaysForEmployee(query);
      return {
        success: true,
        data: days,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 查某天的出勤列表（可選擇部門）
   */
  async listDailyAttendance(
    query: DailyAttendanceByDeptQuery
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listDailyAttendanceByDepartment>>>
  > {
    try {
      const rows = await listDailyAttendanceByDepartment(query);
      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 建立補卡申請
   */
  async createCorrection(
    payload: CreateCorrectionPayload
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof createCorrectionRequest>>>
  > {
    try {
      const correction = await createCorrectionRequest(payload);
      return {
        success: true,
        data: correction,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 審核補卡申請（核准 / 駁回）
   */
  async reviewCorrection(
    payload: ReviewCorrectionPayload
  ): Promise<ServiceResponse<null>> {
    try {
      await reviewCorrectionRequest(payload);
      return { success: true, data: null };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 員工查自己的補卡申請列表
   */
  async listCorrectionsForEmployee(
    employeeId: string
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listCorrectionsForEmployee>>>
  > {
    try {
      const rows = await listCorrectionsForEmployee(employeeId);
      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 審核者查待審補卡申請（目前 repository 是列出全部 pending，
   * 你之後可以在那邊加上「這個 approver 負責哪幾個人」的過濾）
   */
  async listPendingCorrectionsForApprover(
    approverEmployeeId: string
  ): Promise<
    ServiceResponse<
      Awaited<ReturnType<typeof listPendingCorrectionsForApprover>>
    >
  > {
    try {
      const rows = await listPendingCorrectionsForApprover(approverEmployeeId);
      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }
}

export default new AttendanceService();
