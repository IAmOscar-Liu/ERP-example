import { Request, Response } from "express";
import { sendJsonResponse } from "../lib/general";
import { OvertimeFilter } from "../repository";
import overtimeService from "../service/overtime.service";

class OvertimeController {
  async createOvertime(req: Request, res: Response) {
    const result = await overtimeService.createOvertime(req.body);
    sendJsonResponse(res, result);
  }

  async updateOvertime(req: Request, res: Response) {
    const { id } = req.params;
    const result = await overtimeService.updateOvertime(id, req.body);
    sendJsonResponse(res, result);
  }

  async getOvertime(req: Request, res: Response) {
    const { id } = req.params;
    const result = await overtimeService.getOvertime(id);
    sendJsonResponse(res, result);
  }

  async listOvertime(req: Request, res: Response) {
    const { employeeId, status, from, to, page, limit } = req.query;
    const result = await overtimeService.listOvertime({
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (String(status) as OvertimeFilter["status"]) : undefined,
      from: from
        ? new Date(typeof from === "number" ? from : String(from))
        : undefined,
      to: to ? new Date(typeof to === "number" ? to : String(to)) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendJsonResponse(res, result);
  }

  async reviewOvertime(req: Request, res: Response) {
    const result = await overtimeService.reviewOvertime(req.body);
    sendJsonResponse(res, result);
  }

  async cancelOvertime(req: Request, res: Response) {
    const result = await overtimeService.cancelOvertime(req.body);
    sendJsonResponse(res, result);
  }

  async listOvertimeForEmployee(req: Request, res: Response) {
    const { id: employeeId } = req.params;
    const { status, from, to } = req.query;
    const result = await overtimeService.listOvertimeForEmployee(employeeId, {
      status: status ? (String(status) as OvertimeFilter["status"]) : undefined,
      from: from
        ? new Date(typeof from === "number" ? from : String(from))
        : undefined,
      to: to ? new Date(typeof to === "number" ? to : String(to)) : undefined,
    });
    sendJsonResponse(res, result);
  }
}

export default new OvertimeController();
