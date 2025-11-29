import { Request, Response } from "express";
import { sendJsonResponse } from "../lib/general";
import { EmployeeFilter } from "../repository";
import employeeService from "../service/employee.service";

class EmployeeController {
  async getEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const result = await employeeService.getEmployee(id);
    sendJsonResponse(res, result);
  }

  async listEmployees(req: Request, res: Response) {
    const { departmentId, status, keyword } = req.query;
    const result = await employeeService.listEmployees({
      departmentId: departmentId ? String(departmentId) : undefined,
      status: status ? (String(status) as EmployeeFilter["status"]) : undefined,
      keyword: keyword ? String(keyword) : undefined,
    });
    sendJsonResponse(res, result);
  }

  async getEmployeeStats(req: Request, res: Response) {
    const { id } = req.params;
    const { from, to } = req.query;
    const result = await employeeService.getEmployeeStats({
      employeeId: id,
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
    });
    sendJsonResponse(res, result);
  }
}

export default new EmployeeController();
