import { Request, Response } from "express";
import attendanceService from "../service/attendance.service";
import { sendJsonResponse } from "../lib/general";

class AttendanceController {
  async clock(req: Request, res: Response) {
    const result = await attendanceService.clock(req.body);
    sendJsonResponse(res, result);
  }

  async getEmployeeAttendance(req: Request, res: Response) {
    const { id: employeeId } = req.params;
    const { fromDate, toDate } = req.query;
    const result = await attendanceService.getEmployeeAttendance({
      employeeId: String(employeeId),
      fromDate: fromDate ? String(fromDate) : undefined,
      toDate: toDate ? String(toDate) : undefined,
    });
    sendJsonResponse(res, result);
  }
}

export default new AttendanceController();
