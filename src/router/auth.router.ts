import { Router } from "express";
import AuthController from "../controller/auth.controller";
import AuthMiddleware from "../middleware/auth.middleware";
import isAuth from "../middleware/isAuth";

const router = Router();

router.post("/login", AuthMiddleware.login, AuthController.login);
router.post("/register", AuthMiddleware.register, AuthController.register);
router.post("/profile", isAuth, AuthController.profile);
router.post("/logout", AuthController.logout);
router.post("/refresh-token", AuthController.refreshToken);

router.put(
  "/update",
  isAuth,
  AuthMiddleware.updateAccount,
  AuthController.updateAccount
);
router.put(
  "/change-password",
  isAuth,
  AuthMiddleware.changePassword,
  AuthController.changePassword
);

export default router;
