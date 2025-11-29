import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import EmployeeRouter from "./router/employee.router";
import AttendanceRouter from "./router/attendance.router";
import AuthRouter from "./router/auth.router";
import CompTimeRouter from "./router/compTime.router";
import LeaveRouter from "./router/leave.router";
import OvertimeRouter from "./router/overtime.router";
import ShiftRouter from "./router/shift.router";

const app = express();
const PORT = process.env.PORT ?? 4000;

console.table({
  PORT: process.env.PORT,
  COMPANY_TIMEZONE: process.env.COMPANY_TIMEZONE,
  DATABASE_URL: process.env.DATABASE_URL,
});

app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/api/test", (_, res) => {
  res.send({
    success: true,
    data: {
      PORT: process.env.PORT,
      COMPANY_TIMEZONE: process.env.COMPANY_TIMEZONE,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
});

app.use("/api/auth", AuthRouter);
app.use("/api/employee", EmployeeRouter);
app.use("/api/attendance", AttendanceRouter);
app.use("/api/leave", LeaveRouter);
app.use("/api/overtime", OvertimeRouter);
app.use("/api/compTime", CompTimeRouter);
app.use("/api/shift", ShiftRouter);

app.use(errorHandler);

// Handle production
if (process.env.NODE_ENV === "production") {
  // Set static folder
  app.use(express.static(__dirname + "/client/"));

  // Handle SPA
  app.get(/.*/, (_, res) => res.sendFile(__dirname + "/client/index.html"));
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
