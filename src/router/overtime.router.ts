import { Router } from "express";
import OvertimeController from "../controller/overtime.controller";
import OvertimeMiddleware from "../middleware/overtime.middleware";
import isAuth from "../middleware/isAuth";
import requirePermission from "../middleware/requirePermission";

const router = Router();

router.post(
  "/",
  isAuth,
  OvertimeMiddleware.createOvertime,
  OvertimeController.createOvertime
);
router.put(
  "/update/:id",
  isAuth,
  OvertimeMiddleware.updateOvertime,
  OvertimeController.updateOvertime
);
router.get("/list", isAuth, OvertimeController.listOvertime);
router.put(
  "/review",
  isAuth,
  requirePermission(["OVERTIME_REVIEW"]),
  OvertimeMiddleware.reviewOvertime,
  OvertimeController.reviewOvertime
);
router.put(
  "/cancel",
  isAuth,
  OvertimeMiddleware.cancelOvertime,
  OvertimeController.cancelOvertime
);
router.get("/:id", isAuth, OvertimeController.getOvertime);
router.get("/:id/list", isAuth, OvertimeController.listOvertimeForEmployee);

export default router;
