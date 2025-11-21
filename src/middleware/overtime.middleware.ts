import { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Schema for creating an overtime request
const createOvertimeSchema = z
  .object({
    employeeId: z.string().min(1, { error: "Employee ID is required" }),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      error: "Work date must be in YYYY-MM-DD format",
    }),
    startAt: z.coerce.date({ error: "Invalid start time" }),
    endAt: z.coerce.date({ error: "Invalid end time" }),
    plannedHours: z.coerce
      .number()
      .positive({ error: "Planned hours must be a positive number" })
      .transform(String),
    status: z
      .enum(["draft", "pending", "approved", "rejected", "cancelled"])
      .optional(),
    reason: z.string().nullable().optional(),
    approverEmployeeId: z.string().nullable().optional(),
    decisionNote: z.string().nullable().optional(),
    decidedAt: z.coerce.date().nullable().optional(),
    approvedHours: z.coerce
      .number()
      .positive()
      .transform(String)
      .nullable()
      .optional(),
    convertToCompTime: z.boolean().optional(),
  })
  .refine((data) => data.endAt > data.startAt, {
    error: "End time must be after start time",
    path: ["endAt"],
  });

// Schema for updating an overtime request. It's a partial version of the create schema.
const updateOvertimeSchema = createOvertimeSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt && data.endAt <= data.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endAt"],
      });
    }
  });

// Schema for reviewing an overtime request
const reviewOvertimeSchema = z.object({
  overtimeRequestId: z
    .string()
    .min(1, { error: "Overtime Request ID is required" }),
  approverEmployeeId: z
    .string()
    .min(1, { error: "Approver Employee ID is required" }),
  approve: z.boolean({ error: "Approve field is required" }),
  decisionNote: z.string().optional(),
  approvedHours: z.coerce.number().positive().nullable().optional(),
  convertToCompTime: z.boolean().optional(),
});

const cancelOvertimeSchema = z.object({
  overtimeRequestId: z
    .string()
    .min(1, { error: "Overtime Request ID is required" }),
  approverEmployeeId: z
    .string()
    .min(1, { error: "Approver Employee ID is required" }),
  decisionNote: z.string().optional(),
});

class OvertimeMiddleware {
  createOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = createOvertimeSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  reviewOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = reviewOvertimeSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
  cancelOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = cancelOvertimeSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  updateOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = updateOvertimeSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default new OvertimeMiddleware();
