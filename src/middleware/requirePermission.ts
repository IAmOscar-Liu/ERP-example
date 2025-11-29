import { NextFunction, Response } from "express";
import { CustomError } from "../lib/error";
import { RequestWithId } from "../type/request";
import { getEmployeeRoles } from "../repository";

export default function requirePermission(permissions: string[]) {
  return async (req: RequestWithId, _: Response, next: NextFunction) => {
    const employeeId = req.userId;
    if (!employeeId) return next(new CustomError("Permission denied", 403));

    const employeeRoles = await getEmployeeRoles(employeeId);
    const hasPermission = !!employeeRoles.find(({ role }) => {
      if (role.code === "ADMIN") return true;
      return !!role.rolePermissions.find((permission) =>
        permissions.includes(permission.permission.code)
      );
    });

    if (!hasPermission) return next(new CustomError("Permission denied", 403));
    next();
  };
}
