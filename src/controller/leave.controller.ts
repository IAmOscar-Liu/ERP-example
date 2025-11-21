import { Request, Response } from "express";
import leaveService from "../service/leave.service";
import { sendJsonResponse } from "../lib/general";
import { LeaveFilter } from "../repository";

class LeaveController {
  async listLeaveTypes(req: Request, res: Response) {
    const result = await leaveService.listLeaveTypes();
    sendJsonResponse(res, result);
  }

  async createLeave(req: Request, res: Response) {
    const result = await leaveService.createLeave(req.body);
    sendJsonResponse(res, result);
  }

  async updateLeave(req: Request, res: Response) {
    const { id } = req.params;
    const result = await leaveService.updateLeave(id, req.body);
    sendJsonResponse(res, result);
  }

  async getLeave(req: Request, res: Response) {
    const { id } = req.params;
    const result = await leaveService.getLeave(id);
    sendJsonResponse(res, result);
  }

  async listLeaves(req: Request, res: Response) {
    const { employeeId, status, from, to } = req.query;
    const result = await leaveService.listLeaves({
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (String(status) as LeaveFilter["status"]) : undefined,
      from: from
        ? new Date(typeof from === "number" ? from : String(from))
        : undefined,
      to: to ? new Date(typeof to === "number" ? to : String(to)) : undefined,
    });
    sendJsonResponse(res, result);
  }

  async reviewLeave(req: Request, res: Response) {
    const result = await leaveService.reviewLeave(req.body);
    sendJsonResponse(res, result);
  }

  async cancelLeave(req: Request, res: Response) {
    const result = await leaveService.cancelLeave(req.body);
    sendJsonResponse(res, result);
  }

  async listLeavesForEmployee(req: Request, res: Response) {
    const { id: employeeId } = req.params;
    const { status, from, to } = req.query;
    const result = await leaveService.listLeavesForEmployee(employeeId, {
      status: status ? (String(status) as LeaveFilter["status"]) : undefined,
      from: from
        ? new Date(typeof from === "number" ? from : String(from))
        : undefined,
      to: to ? new Date(typeof to === "number" ? to : String(to)) : undefined,
    });
    sendJsonResponse(res, result);
  }
}

export default new LeaveController();
