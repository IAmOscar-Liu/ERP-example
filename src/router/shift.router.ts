import { Router } from "express";
import ShiftController from "../controller/shift.controller";
import ShiftMiddleware from "../middleware/shift.middleware";
import isAuth from "../middleware/isAuth";

const router = Router();

router.get("/types", isAuth, ShiftController.listShiftTypes);
router.post(
  "/types",
  isAuth,
  ShiftMiddleware.createShiftType,
  ShiftController.createShiftType
);
router.put(
  "/types/:id",
  isAuth,
  ShiftMiddleware.updateShiftType,
  ShiftController.updateShiftType
);

router.get("/schedules", isAuth, ShiftController.getShiftSchedules);
router.post(
  "/schedules",
  isAuth,
  ShiftMiddleware.upsertShiftSchedule,
  ShiftController.upsertShiftSchedule
);

router.get("/change/list", isAuth, ShiftController.listShiftChangeRequests);
router.post(
  "/change",
  isAuth,
  ShiftMiddleware.createShiftChangeRequest,
  ShiftController.createShiftChangeRequest
);
router.put(
  "/change/review",
  isAuth,
  ShiftMiddleware.reviewShiftChangeRequest,
  ShiftController.reviewShiftChangeRequest
);

export default router;
