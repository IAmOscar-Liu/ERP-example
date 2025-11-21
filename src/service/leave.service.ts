// src/service/leave.service.ts
import * as schema from "../db/schema";
import { handleServiceError } from "../lib/error";
import { ServiceResponse } from "../type/general";
import {
  listLeaveTypes,
  createLeaveRequest,
  listLeaveRequests,
  reviewLeaveRequest,
  NewLeaveRequest,
  LeaveFilter,
  ReviewLeavePayload,
  cancelLeaveRequest,
  CancelLeavePayload,
  updateLeaveRequest,
  getLeaveRequest,
} from "../repository";

type LeaveRequestRow = typeof schema.leaveRequests.$inferSelect;

class LeaveService {
  async listLeaveTypes(): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listLeaveTypes>>>
  > {
    try {
      const leaveTypes = await listLeaveTypes();
      return {
        success: true,
        data: leaveTypes,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 建立請假申請
   */
  async createLeave(
    input: NewLeaveRequest
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof createLeaveRequest>>>> {
    try {
      const leave = await createLeaveRequest(input);

      if (!leave) {
        return {
          success: false,
          statusCode: 500,
          message: "Failed to create leave request",
        };
      }

      return {
        success: true,
        data: leave,
      };
    } catch (error) {
      console.error(error);
      return handleServiceError(error);
    }
  }

  async updateLeave(
    id: string,
    input: NewLeaveRequest
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof updateLeaveRequest>>>> {
    try {
      const leave = await updateLeaveRequest(id, input);

      if (!leave) {
        return {
          success: false,
          statusCode: 500,
          message: "Failed to create leave request",
        };
      }

      return {
        success: true,
        data: leave,
      };
    } catch (error) {
      console.error(error);
      return handleServiceError(error);
    }
  }

  async getLeave(
    id: string
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof getLeaveRequest>>>> {
    try {
      const leave = await getLeaveRequest(id);

      if (!leave) {
        return {
          success: false,
          statusCode: 404,
          message: "Leave request not found",
        };
      }

      return {
        success: true,
        data: leave,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 查詢請假申請列表
   * 可用 employeeId / status / from / to 過濾
   */
  async listLeaves(
    filter: LeaveFilter = {}
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof listLeaveRequests>>>> {
    try {
      const rows = await listLeaveRequests(filter);

      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      console.error(error);
      return handleServiceError(error);
    }
  }

  /**
   * 審核請假申請（核准 / 駁回）
   */
  async reviewLeave(
    payload: ReviewLeavePayload
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof reviewLeaveRequest>>>> {
    try {
      const updated = await reviewLeaveRequest(payload);

      if (!updated) {
        return {
          success: false,
          statusCode: 404,
          message: "Leave request not found",
        };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async cancelLeave(
    payload: CancelLeavePayload
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof cancelLeaveRequest>>>> {
    try {
      const updated = await cancelLeaveRequest(payload);

      if (!updated) {
        return {
          success: false,
          statusCode: 404,
          message: "Leave request not found",
        };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 方便用的 wrapper：指定員工查自己的請假紀錄
   */
  async listLeavesForEmployee(
    employeeId: string,
    extra?: Omit<LeaveFilter, "employeeId">
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof listLeaveRequests>>>> {
    try {
      const rows = await listLeaveRequests({
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

export default new LeaveService();
