import { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Schema for creating a shift type
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createShiftTypeSchema = z.object({
  // prettier-ignore
  name: z.string().min(1, { error: "Name is required" }),
  code: z.string().min(1, { error: "Code is required" }),
  startTime: z.string().regex(timeRegex, {
    error: "Invalid start time format. Use HH:mm or HH:mm:ss",
  }),
  endTime: z.string().regex(timeRegex, {
    error: "Invalid end time format. Use HH:mm or HH:mm:ss",
  }),
  breakMinutes: z.number().int().positive().optional(),
  isNightShift: z.boolean().optional(),
  color: z.string().nullable().optional(),
});

// Schema for updating a shift type
const updateShiftTypeSchema = z // prettier-ignore
  .object({
    name: z.string().min(1, { error: "Name is required" }).optional(),
    code: z.string().min(1, { error: "Code is required" }).optional(),
    startTime: z
      .string()
      .regex(timeRegex, {
        error: "Invalid start time format. Use HH:mm or HH:mm:ss",
      })
      .optional(),
    endTime: z
      .string()
      .regex(timeRegex, {
        error: "Invalid end time format. Use HH:mm or HH:mm:ss",
      })
      .optional(),
    breakMinutes: z.number().int().positive().optional(),
    isNightShift: z.boolean().optional(),
    color: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided for update",
  });

// Schema for upserting a shift schedule
const upsertShiftScheduleSchema = z.object({
  employeeId: z.string().min(1, { error: "Employee ID is required" }),
  workDate: z.string().regex(dateRegex, {
    error: "Work date must be in YYYY-MM-DD format",
  }),
  shiftTypeId: z.string().min(1, { error: "Shift Type ID is required" }),
  isLocked: z.boolean().optional(),
  note: z.string().nullable().optional(),
});

// Schema for creating a shift change request
const createShiftChangeRequestSchema = z.object({
  type: z.enum(["swap", "cover"]),
  requesterEmployeeId: z
    .string()
    .min(1, { error: "Requester Employee ID is required" }),
  fromEmployeeId: z.string().min(1, { error: "From Employee ID is required" }),
  fromWorkDate: z.string().regex(dateRegex, {
    error: "From work date must be in YYYY-MM-DD format",
  }),
  fromShiftTypeId: z
    .string()
    .min(1, { error: "From Shift Type ID is required" }),
  toEmployeeId: z.string().min(1, { error: "To Employee ID is required" }),
  toWorkDate: z.string().regex(dateRegex, {
    error: "To work date must be in YYYY-MM-DD format",
  }),
  toShiftTypeId: z.string().min(1, { error: "To Shift Type ID is required" }),
  reason: z.string().nullable().optional(),
});

// Schema for reviewing a shift change request
const reviewShiftChangeRequestSchema = z.object({
  requestId: z.string().min(1, { error: "Request ID is required" }),
  approverEmployeeId: z
    .string()
    .min(1, { error: "Approver Employee ID is required" }),
  approve: z.boolean({ error: "Approve field is required" }),
  decisionNote: z.string().optional(),
});

class ShiftMiddleware {
  createShiftType(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = createShiftTypeSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  updateShiftType(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = updateShiftTypeSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  upsertShiftSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = upsertShiftScheduleSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  createShiftChangeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = createShiftChangeRequestSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  reviewShiftChangeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = reviewShiftChangeRequestSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default new ShiftMiddleware();
