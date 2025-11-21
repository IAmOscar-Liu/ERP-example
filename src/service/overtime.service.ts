// src/service/overtime.service.ts
import { handleServiceError } from "../lib/error";
import { ServiceResponse } from "../type/general";
import * as schema from "../db/schema";

import {
  createOvertimeRequest,
  listOvertimeRequests,
  reviewOvertimeRequest,
  NewOvertimeRequest,
  OvertimeFilter,
  ReviewOvertimePayload,
  CancelOvertimePayload,
  cancelOvertimeRequest,
  updateOvertimeRequest,
  getOvertimeRequest,
} from "../repository";

type OvertimeRequestRow = typeof schema.overtimeRequests.$inferSelect;

class OvertimeService {
  /**
   * 建立加班申請
   */
  async createOvertime(
    input: NewOvertimeRequest
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof createOvertimeRequest>>>
  > {
    try {
      const ot = await createOvertimeRequest(input);
      if (!ot) {
        return {
          success: false,
          statusCode: 500,
          message: "Failed to create overtime request",
        };
      }
      return {
        success: true,
        data: ot,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async updateOvertime(
    id: string,
    input: NewOvertimeRequest
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof updateOvertimeRequest>>>
  > {
    try {
      const overtime = await updateOvertimeRequest(id, input);

      if (!overtime) {
        return {
          success: false,
          statusCode: 404,
          message: "Overtime request not found",
        };
      }

      return {
        success: true,
        data: overtime,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async getOvertime(
    id: string
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof getOvertimeRequest>>>> {
    try {
      const overtime = await getOvertimeRequest(id);

      if (!overtime) {
        return {
          success: false,
          statusCode: 404,
          message: "Overtime request not found",
        };
      }

      return {
        success: true,
        data: overtime,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 查詢加班申請列表
   */
  async listOvertime(
    filter: OvertimeFilter = {}
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listOvertimeRequests>>>
  > {
    try {
      const rows = await listOvertimeRequests(filter);
      return {
        success: true,
        data: rows,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * 審核加班申請（核准 / 駁回）
   */
  async reviewOvertime(
    payload: ReviewOvertimePayload
  ): Promise<ServiceResponse<OvertimeRequestRow>> {
    try {
      const updated = await reviewOvertimeRequest(payload);

      if (!updated) {
        return {
          success: false,
          statusCode: 404,
          message: "Overtime request not found",
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

  async cancelOvertime(
    payload: CancelOvertimePayload
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof cancelOvertimeRequest>>>
  > {
    try {
      const updated = await cancelOvertimeRequest(payload);

      if (!updated) {
        return {
          success: false,
          statusCode: 404,
          message: "Overtime request not found",
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
   * 指定員工查自己的加班紀錄
   */
  async listOvertimeForEmployee(
    employeeId: string,
    extra?: Omit<OvertimeFilter, "employeeId">
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listOvertimeRequests>>>
  > {
    try {
      const rows = await listOvertimeRequests({
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

export default new OvertimeService();
