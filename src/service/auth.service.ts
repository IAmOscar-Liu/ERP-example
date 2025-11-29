// src/service/auth.service.ts
import * as schema from "../db/schema";
import { handleServiceError } from "../lib/error";
import {
  changeUserPasswordById,
  createEmployeeWithUser,
  CreateEmployeeWithUserInput,
  getEmployeeById,
  updateEmployee,
  loginWithEmailPassword,
  resetUserPasswordByEmail,
  getUserRoles,
} from "../repository";
import { ServiceResponse } from "../type/general";

type UserRow = typeof schema.users.$inferSelect;

interface LoginInput {
  email: string;
  password: string;
}

interface ChangePasswordInput {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

interface ResetPasswordInput {
  email: string;
  newPassword: string;
}

class AuthService {
  /**
   * 建立帳號：同時建立 user + employee
   */
  async createAccount(
    input: CreateEmployeeWithUserInput
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof createEmployeeWithUser>>>
  > {
    try {
      const account = await createEmployeeWithUser(input);

      if (account) {
        return { success: true, data: account };
      } else {
        return {
          success: false,
          statusCode: 500,
          message: "Failed to create account",
        };
      }
    } catch (error) {
      // console.error(error);
      return handleServiceError(error);
    }
  }

  /**
   * Login：email + password
   */
  async login(
    input: LoginInput
  ): Promise<
    ServiceResponse<Awaited<ReturnType<typeof loginWithEmailPassword>>>
  > {
    try {
      const result = await loginWithEmailPassword(input);

      if (!result) {
        return {
          success: false,
          statusCode: 401,
          message: "Invalid email or password",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async getAccountById(
    id: string
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof getEmployeeById>>>> {
    try {
      const result = await getEmployeeById(id);

      if (!result) {
        return {
          success: false,
          statusCode: 404,
          message: "Account not found",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  async updateAccount(
    id: string,
    payload: Parameters<typeof updateEmployee>[1]
  ): Promise<ServiceResponse<Awaited<ReturnType<typeof updateEmployee>>>> {
    try {
      const result = await updateEmployee(id, payload);

      if (!result) {
        return {
          success: false,
          statusCode: 404,
          message: "Account not found",
        };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * Change password（需要舊密碼）
   */
  async changePassword(
    input: ChangePasswordInput
  ): Promise<ServiceResponse<UserRow>> {
    try {
      const updated = await changeUserPasswordById(input);

      if (!updated) {
        return {
          success: false,
          statusCode: 400,
          message: "Old password is incorrect or user not found",
        };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }

  /**
   * Reset password（透過 email，通常在 reset token 驗證後使用）
   */
  async resetPassword(
    input: ResetPasswordInput
  ): Promise<ServiceResponse<UserRow>> {
    try {
      const updated = await resetUserPasswordByEmail(input);

      if (!updated) {
        return {
          success: false,
          statusCode: 404,
          message: "User not found",
        };
      }

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      return handleServiceError(error);
    }
  }
}

export default new AuthService();
