import { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Schema for creating a leave request
const createLeaveSchema = z // prettier-ignore
  .object({
    employeeId: z.string().min(1, { error: "Employee ID is required" }),
    leaveTypeId: z.string().min(1, { error: "Leave Type ID is required" }),
    startAt: z.coerce.date({
      error: "Invalid start date",
    }),
    endAt: z.coerce.date({ error: "Invalid end date" }),
    hours: z.coerce
      .number()
      .positive({ error: "Hours must be a positive number" })
      .transform(String), // The final parsed value will be a string
    status: z
      .enum(["draft", "pending", "approved", "rejected", "cancelled"])
      .optional(),
    reason: z.string().nullable().optional(),
    approverEmployeeId: z.string().nullable().optional(),
    decisionNote: z.string().nullable().optional(),
    decidedAt: z.coerce.date().nullable().optional(),
    attachments: z.unknown().optional(),
  })
  .refine((data) => data.endAt >= data.startAt, {
    error: "End date cannot be before start date",
    path: ["endAt"], // Associates the error with the endAt field
  });

// Schema for updating a leave request. It's a partial version of the create schema.
const updateLeaveSchema = createLeaveSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt && data.endAt < data.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date cannot be before start date",
        path: ["endAt"],
      });
    }
  });

// Schema for reviewing a leave request
const reviewLeaveSchema = z.object({
  leaveRequestId: z.string().min(1, { error: "Leave Request ID is required" }),
  approverEmployeeId: z
    .string()
    .min(1, { error: "Approver Employee ID is required" }),
  approve: z.boolean({ error: "Approve field is required" }),
  decisionNote: z.string().optional(),
});

const cancelLeaveSchema = z.object({
  leaveRequestId: z.string().min(1, { error: "Leave Request ID is required" }),
  approverEmployeeId: z
    .string()
    .min(1, { error: "Approver Employee ID is required" }),
  decisionNote: z.string().optional(),
});

class LeaveMiddleware {
  createLeave(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = createLeaveSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  reviewLeave(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = reviewLeaveSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  cancelLeave(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = cancelLeaveSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  updateLeave(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = updateLeaveSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default new LeaveMiddleware();
