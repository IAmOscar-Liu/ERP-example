import { Router } from "express";
import EmployeeController from "../controller/employee.controller";
import isAuth from "../middleware/isAuth";

const router = Router();

router.get("/list", isAuth, EmployeeController.listEmployees);
router.get("/:id", isAuth, EmployeeController.getEmployee);
router.get("/:id/stats", isAuth, EmployeeController.getEmployeeStats);

export default router;
