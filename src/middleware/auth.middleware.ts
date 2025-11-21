import { NextFunction, Request, Response } from "express";
import { z } from "zod";

// Password validation regex: min 8 characters, 1 uppercase, 1 lowercase, 1 special character.
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/
);

// Schema for user login validation
const loginSchema = z.object({
  email: z.string().email({ error: "Invalid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});

// Schema for user registration validation
const registerSchema = z.object({
  email: z.string().email({ error: "Invalid email address" }),
  password: z.string().regex(passwordValidation, {
    error:
      "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.",
  }),
  isActive: z.boolean().optional(),
  employeeNo: z.string(),
  fullName: z
    .string()
    .min(2, { error: "Full name must be at least 2 characters" }),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: "Hire date must be in YYYY-MM-DD format",
  }),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  status: z
    .enum(["active", "onboarding", "suspended", "terminated"])
    .optional(),
  employmentType: z
    .enum(["full_time", "part_time", "contractor", "intern"])
    .optional(),
});

// Schema for updating user account information
const updateAccountSchema = z
  .object({
    userId: z.string().optional(), // Often this is taken from URL params or JWT, but validating if in body.
    employeeNo: z.string().optional(),
    fullName: z
      .string()
      .min(2, { error: "Full name must be at least 2 characters" })
      .optional(),
    hireDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: "Hire date must be in YYYY-MM-DD format",
      })
      .optional(),
    email: z.string().email({ error: "Invalid email address" }).optional(),
    phone: z.string().nullable().optional(),
    departmentId: z.string().nullable().optional(),
    positionId: z.string().nullable().optional(),
    managerId: z.string().nullable().optional(),
    status: z
      .enum(["active", "onboarding", "suspended", "terminated"])
      .optional(),
    employmentType: z
      .enum(["full_time", "part_time", "contractor", "intern"])
      .optional(),
    leaveDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: "Leave date must be in YYYY-MM-DD format",
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided for update",
  });

// Schema for changing a user's password
const changePasswordSchema = z.object({
  userId: z.string(),
  oldPassword: z.string().min(1, { error: "Old password is required" }),
  newPassword: z.string().regex(passwordValidation, {
    error:
      "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character.",
  }),
});

class AuthMiddleware {
  login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate and replace req.body with the parsed (and typed) data
      req.body = loginSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  register(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = registerSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  updateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = updateAccountSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }

  changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = changePasswordSchema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthMiddleware();
