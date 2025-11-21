import { Request, Response } from "express";
import shiftService from "../service/shift.service";
import { sendJsonResponse } from "../lib/general";

class ShiftController {
  // ============================
  // Shift Types
  // ============================

  async listShiftTypes(req: Request, res: Response) {
    const result = await shiftService.listShiftTypes();
    sendJsonResponse(res, result);
  }

  async createShiftType(req: Request, res: Response) {
    const result = await shiftService.createShiftType(req.body);

    sendJsonResponse(res, result);
  }

  async updateShiftType(req: Request, res: Response) {
    const { id } = req.params;
    const result = await shiftService.updateShiftType(id, req.body);
    sendJsonResponse(res, result);
  }

  // ============================
  // Shift Schedules
  // ============================

  async getShiftSchedules(req: Request, res: Response) {
    const { employeeId, fromDate, toDate } = req.query;

    const result = await shiftService.getShiftSchedules({
      employeeId: employeeId ? String(employeeId) : undefined,
      fromDate: String(fromDate),
      toDate: String(toDate),
    });

    sendJsonResponse(res, result);
  }

  async upsertShiftSchedule(req: Request, res: Response) {
    const result = await shiftService.upsertShiftSchedule(req.body);
    sendJsonResponse(res, result);
  }

  // ============================
  // Shift Change Requests
  // ============================

  async listShiftChangeRequests(req: Request, res: Response) {
    const { employeeId, status } = req.query;

    const result = await shiftService.listShiftChangeRequests({
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status
        ? (String(status) as "pending" | "approved" | "rejected")
        : undefined,
    });

    sendJsonResponse(res, result);
  }

  async createShiftChangeRequest(req: Request, res: Response) {
    const result = await shiftService.createShiftChangeRequest(req.body);
    sendJsonResponse(res, result);
  }

  async reviewShiftChangeRequest(req: Request, res: Response) {
    const result = await shiftService.reviewShiftChangeRequest(req.body);
    sendJsonResponse(res, result);
  }
}

export default new ShiftController();
