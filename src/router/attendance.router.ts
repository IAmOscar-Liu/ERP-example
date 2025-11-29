import { Router } from "express";
import AttendanceController from "../controller/attendance.controller";
import AttendanceMiddleware from "../middleware/attendance.middleware";
import isAuth from "../middleware/isAuth";

const router = Router();

router.post(
  "/clock",
  isAuth,
  AttendanceMiddleware.clock,
  AttendanceController.clock
);
router.get("/list", isAuth, AttendanceController.getAttendance);
router.get("/:id", isAuth, AttendanceController.getEmployeeAttendance);

export default router;
