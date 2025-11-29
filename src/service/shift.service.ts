import { handleServiceError } from "../lib/error";
import { ServiceResponse } from "../type/general";
import {
  listShiftTypes as listShiftTypesRepo,
  createShiftType as createShiftTypeRepo,
  updateShiftType as updateShiftTypeRepo,
  getShiftSchedules as getShiftSchedulesRepo,
  upsertShiftSchedule as upsertShiftScheduleRepo,
  listShiftChangeRequests as listShiftChangeRequestsRepo,
  createShiftChangeRequest as createShiftChangeRequestRepo,
  reviewShiftChangeRequest as reviewShiftChangeRequestRepo,
  NewShiftType,
  ShiftChangeRequestRow,
  ShiftScheduleRow,
  ShiftTypeRow,
  CreateShiftChangeInput,
  ReviewShiftChangeInput,
  UpsertShiftScheduleInput,
  ShiftChangeListInput,
  ShiftScheduleQueryInput,
} from "../repository/shift.repository"; // ensure repository/index.ts has `export * from "./shift.repository";`

class ShiftService {
  // -----------------------------
  // Shift Types
  // -----------------------------

  async listShiftTypes(): Promise<ServiceResponse<ShiftTypeRow[]>> {
    try {
      const rows = await listShiftTypesRepo();
      return { success: true, data: rows };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async createShiftType(
    input: NewShiftType
  ): Promise<ServiceResponse<ShiftTypeRow>> {
    try {
      const row = await createShiftTypeRepo(input);
      return { success: true, data: row };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async updateShiftType(
    id: string,
    input: Partial<NewShiftType>
  ): Promise<ServiceResponse<ShiftTypeRow | null>> {
    try {
      const row = await updateShiftTypeRepo(id, input);
      if (!row) {
        return {
          success: false,
          statusCode: 404,
          message: "Shift type not found",
        };
      }
      return { success: true, data: row };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  // -----------------------------
  // Shift Schedules
  // -----------------------------

  async getShiftSchedules(
    query: ShiftScheduleQueryInput
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof getShiftSchedulesRepo>>>
  > {
    try {
      const rows = await getShiftSchedulesRepo(query);
      return { success: true, data: rows };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async upsertShiftSchedule(
    input: UpsertShiftScheduleInput
  ): Promise<ServiceResponse<ShiftScheduleRow>> {
    try {
      const row = await upsertShiftScheduleRepo(input);
      return { success: true, data: row };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  // -----------------------------
  // Shift Change Requests
  // -----------------------------

  async listShiftChangeRequests(
    input: ShiftChangeListInput = {}
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof listShiftChangeRequestsRepo>>>
  > {
    try {
      const rows = await listShiftChangeRequestsRepo(input);
      return { success: true, data: rows };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async createShiftChangeRequest(
    input: CreateShiftChangeInput
  ): Promise<ServiceResponse<ShiftChangeRequestRow>> {
    try {
      const row = await createShiftChangeRequestRepo(input);
      return { success: true, data: row };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async reviewShiftChangeRequest(
    input: ReviewShiftChangeInput
  ): Promise<ServiceResponse<ShiftChangeRequestRow | null>> {
    try {
      const row = await reviewShiftChangeRequestRepo(input);
      if (!row) {
        return {
          success: false,
          statusCode: 404,
          message: "Shift change request not found",
        };
      }
      return { success: true, data: row };
    } catch (error) {
      return handleServiceError(error);
    }
  }
}

export default new ShiftService();
