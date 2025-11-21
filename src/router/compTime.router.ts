import { Router } from "express";
import CompTimeController from "../controller/compTime.controller";
import CompTimeMiddleware from "../middleware/compTime.middleware";
import isAuth from "../middleware/isAuth";

const router = Router();

router.post(
  "/",
  isAuth,
  CompTimeMiddleware.addTransaction,
  CompTimeController.addTransaction
);
router.get("/list", isAuth, CompTimeController.listTransactions);
router.get("/:id/list", isAuth, CompTimeController.listForEmployee);
router.get("/:id/balance", isAuth, CompTimeController.getBalance);

export default router;
