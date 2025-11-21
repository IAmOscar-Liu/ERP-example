import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import AttendanceRouter from "./router/attendance.router";
import AuthRouter from "./router/auth.router";
import CompTimeRouter from "./router/compTime.router";
import LeaveRouter from "./router/leave.router";
import OvertimeRouter from "./router/overtime.router";
import ShiftRouter from "./router/shift.router";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.get("/api/test", (_, res) => {
  res.send({
    success: true,
    data: "OK",
  });
});

app.use("/api/auth", AuthRouter);
app.use("/api/attendance", AttendanceRouter);
app.use("/api/leave", LeaveRouter);
app.use("/api/overtime", OvertimeRouter);
app.use("/api/compTime", CompTimeRouter);
app.use("/api/shift", ShiftRouter);

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
