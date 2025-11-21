import { NextFunction, Request, Response } from "express";
import { CustomError } from "../lib/error";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  let statusCode = 500;
  let message: any;

  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    const issue = err.issues[0];
    if (issue.code === "invalid_type") {
      message = `Missing ${issue.path.join(".")}`;
    } else {
      message = issue.message;
    }
  } else {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
};
