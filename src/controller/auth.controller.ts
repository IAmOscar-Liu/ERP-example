import { Request, Response } from "express";
import authService from "../service/auth.service";
import { sendJsonResponse } from "../lib/general";
import { generateToken, sendRefreshToken, validateToken } from "../lib/token";
import { RequestWithId } from "../type/request";
import { getUserRoles } from "../repository";

class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.createAccount(req.body);
    if (result.success) {
      sendRefreshToken(res, result.data);
      sendJsonResponse(res, {
        ...result,
        data: {
          employee: result.data,
          token: generateToken(result.data, "30d"),
        },
      });
    } else {
      sendJsonResponse(res, result);
    }
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    if (result.success) {
      const userId = result.data?.userId;
      let roles: Awaited<ReturnType<typeof getUserRoles>>;
      if (userId) {
        roles = await getUserRoles(userId);
      }

      sendRefreshToken(res, result.data);
      sendJsonResponse(res, {
        ...result,
        data: {
          employee: result.data,
          // @ts-expect-error
          roles,
          token: generateToken(result.data, "30d"),
        },
      });
    } else {
      sendJsonResponse(res, result);
    }
  }

  logout(_: Request, res: Response) {
    res.clearCookie(process.env.REFRESH_TOKEN_NAME!);
    sendJsonResponse(res, { success: true, data: "OK" });
  }

  async profile(req: RequestWithId, res: Response): Promise<any> {
    const result = await authService.getAccountById(req.userId ?? "");

    if (result.success) {
      const userId = result.data?.userId;
      let roles: Awaited<ReturnType<typeof getUserRoles>>;
      if (userId) {
        roles = await getUserRoles(userId);
      }

      sendJsonResponse(res, {
        ...result,
        data: {
          employee: result.data,
          // @ts-expect-error
          roles,
        },
      });
    } else {
      sendJsonResponse(res, result);
    }
  }

  async refreshToken(req: RequestWithId, res: Response): Promise<any> {
    const refreshToken = req.cookies[process.env.REFRESH_TOKEN_NAME!];

    if (!refreshToken) {
      return sendJsonResponse(res, {
        success: false,
        statusCode: 401,
        message: "Refresh token doesn't exist",
      });
    }

    const payload: any = validateToken(refreshToken);
    if (!payload || typeof payload === "string" || !payload.data?.id) {
      return sendJsonResponse(res, {
        success: false,
        statusCode: 403,
        message: "Invalid refresh token",
      });
    }

    // Security Best Practice: Verify the user from the token still exists in the DB.
    const accountCheck = await authService.getAccountById(payload.data.id);
    if (!accountCheck.success) {
      // Clear the invalid cookie and deny the request.
      res.clearCookie(process.env.REFRESH_TOKEN_NAME!);
      return sendJsonResponse(res, {
        success: false,
        statusCode: 403,
        message: "Account no longer exists.",
      });
    }

    // The account is valid, issue a new refresh token and a new access token.
    const newAccessToken = generateToken(accountCheck.data, "30d");
    sendRefreshToken(res, accountCheck.data);
    sendJsonResponse(res, {
      success: true,
      data: { token: newAccessToken },
    });
  }

  async updateAccount(req: RequestWithId, res: Response) {
    const { id, ...update } = req.body;
    if (!id) {
      return sendJsonResponse(res, {
        success: false,
        statusCode: 400,
        message: "id is required.",
      });
    }

    const result = await authService.updateAccount(id, update);
    sendJsonResponse(res, result);
  }

  async changePassword(req: RequestWithId, res: Response) {
    const { id, oldPassword, newPassword } = req.body;
    if (!id || !oldPassword || !newPassword) {
      return sendJsonResponse(res, {
        success: false,
        statusCode: 400,
        message: "id, oldPassword, and newPassword are required.",
      });
    }
    if (id !== req.userId) {
      return sendJsonResponse(res, {
        success: false,
        statusCode: 403,
        message: "You are not authorized to update this account.",
      });
    }
    const result = await authService.changePassword({
      userId: id,
      oldPassword,
      newPassword,
    });
    sendJsonResponse(res, result);
  }
}

export default new AuthController();
