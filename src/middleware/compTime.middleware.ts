import { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Schema for adding a comp time transaction
const addTransactionSchema = z.object({
  employeeId: z.string().min(1, { error: "Employee ID is required" }),
  type: z.enum(["earn", "spend", "adjust"]),
  minutes: z.number({ error: "Minutes are required" }),
  occurredAt: z.coerce.date({ error: "Invalid occurredAt date" }),
  id: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  reason: z.string().nullable().optional(),
  overtimeRequestId: z.string().nullable().optional(),
  leaveRequestId: z.string().nullable().optional(),
});

class CompTimeMiddleware {
  addTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = addTransactionSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default new CompTimeMiddleware();
