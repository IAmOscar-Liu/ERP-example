import { Router } from "express";
import LeaveController from "../controller/leave.controller";
import LeaveMiddleware from "../middleware/leave.middleware";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";

const router = Router();

router.get("/types", isAuth, LeaveController.listLeaveTypes);

router.post(
  "/",
  isAuth,
  LeaveMiddleware.createLeave,
  LeaveController.createLeave
);
router.put(
  "/update/:id",
  isAuth,
  LeaveMiddleware.updateLeave,
  LeaveController.updateLeave
);
router.get("/list", isAuth, LeaveController.listLeaves);
router.put(
  "/review",
  isAuth,
  requirePermission(["LEAVE_REVIEW"]),
  LeaveMiddleware.reviewLeave,
  LeaveController.reviewLeave
);
router.put(
  "/cancel",
  isAuth,
  LeaveMiddleware.cancelLeave,
  LeaveController.cancelLeave
);
router.get("/:id", isAuth, LeaveController.getLeave);
router.get("/:id/list", isAuth, LeaveController.listLeavesForEmployee);

export default router;
