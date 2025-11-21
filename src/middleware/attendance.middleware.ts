import { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Schema for clock-in/clock-out validation
const clockSchema = z.object({
  employeeId: z.string().min(1, { error: "Employee ID is required" }),
  direction: z.enum(["in", "out"]),
  clockAt: z.coerce.date().optional(), // Coerces string/number to Date
  source: z.enum(["web", "mobile", "manual"]).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

class AttendanceMiddleware {
  clock(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate and replace req.body with the parsed (and typed) data
      req.body = clockSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceMiddleware();
