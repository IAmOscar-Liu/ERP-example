import { handleServiceError } from "../lib/error";
import { toDateOnlyString } from "../lib/general";
import {
  EmployeeFilter,
  getAttendanceStatsForEmployee,
  getEmployeeById,
  getLeaveStatsForEmployee,
  getOvertimeStatsForEmployee,
  listEmployees,
} from "../repository";
import { ServiceResponse } from "../type/general";

class EmployeeService {
  async listEmployees(
    filter: EmployeeFilter = {}
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof listEmployees>>>> {
    try {
      const employees = await listEmployees(filter);
      if (!employees) {
        return {
          success: false,
          statusCode: 404,
          message: "Employee not found",
        };
      }
      return {
        success: true,
        data: employees,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async getEmployee(
    id: string
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof getEmployeeById>>>> {
    try {
      const employee = await getEmployeeById(id);
      if (!employee) {
        return {
          success: false,
          statusCode: 404,
          message: "Employee not found",
        };
      }
      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async getEmployeeStats({
    employeeId,
    from,
    to,
  }: {
    employeeId: string;
    from?: string;
    to?: string;
  }) {
    try {
      const attendanceStatsPromise = getAttendanceStatsForEmployee({
        employeeId,
        fromDate: from ? toDateOnlyString(new Date(from)) : undefined,
        toDate: to ? toDateOnlyString(new Date(to)) : undefined,
      });
      const leaveStatsPromise = getLeaveStatsForEmployee({
        employeeId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        status: "approved",
      });
      const overtimeStatsPromise = getOvertimeStatsForEmployee({
        employeeId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        status: "approved",
      });
      const [attendanceStats, leaveStats, overtimeStats] = await Promise.all([
        attendanceStatsPromise,
        leaveStatsPromise,
        overtimeStatsPromise,
      ]);

      return {
        success: true as true,
        data: {
          attendanceStats,
          leaveStats,
          overtimeStats,
        },
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }
}

export default new EmployeeService();
