import { Request, Response } from "express";
import compTimeService from "../service/compTime.service";
import { sendJsonResponse } from "../lib/general";
import { CompTimeTxnFilter } from "../repository";

class CompTimeController {
  async getBalance(req: Request, res: Response) {
    const { id: employeeId } = req.params;
    const result = await compTimeService.getBalance(employeeId);
    sendJsonResponse(res, result);
  }

  async listTransactions(req: Request, res: Response) {
    const { employeeId, type, from, to, page, limit } = req.query;
    const result = await compTimeService.listTransactions({
      employeeId: employeeId ? String(employeeId) : undefined,
      type: type ? (String(type) as CompTimeTxnFilter["type"]) : undefined,
      from: from
        ? new Date(typeof from === "number" ? from : String(from))
        : undefined,
      to: to ? new Date(typeof to === "number" ? to : String(to)) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendJsonResponse(res, result);
  }

  async addTransaction(req: Request, res: Response) {
    const result = await compTimeService.addTransaction(req.body);
    sendJsonResponse(res, result);
  }

  async listForEmployee(req: Request, res: Response) {
    const { id: employeeId } = req.params;
    const { type, from, to, page, limit } = req.query;
    const result = await compTimeService.listForEmployee(employeeId, {
      type: type ? (String(type) as CompTimeTxnFilter["type"]) : undefined,
      from: from
        ? new Date(typeof from === "number" ? from : String(from))
        : undefined,
      to: to ? new Date(typeof to === "number" ? to : String(to)) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    sendJsonResponse(res, result);
  }
}

export default new CompTimeController();
