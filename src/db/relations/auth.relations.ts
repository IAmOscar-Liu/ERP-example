// src/db/relations/auth.relations.ts
import { relations } from "drizzle-orm";
import {
  users,
  employees,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  passwordResetTokens,
} from "../schema";

// ================ Users ================
export const usersRelations = relations(users, ({ one, many }) => ({
  // 1:1-ish 使用者 ↔ 員工（employees.userId → users.id）
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),

  // 使用者擁有的角色（多對多 via userRoles）
  userRoles: many(userRoles),

  // 密碼重設 token
  passwordResetTokens: many(passwordResetTokens),
}));

// ================ Roles ================
export const rolesRelations = relations(roles, ({ many }) => ({
  // 角色對應的權限（多對多 via rolePermissions）
  rolePermissions: many(rolePermissions),

  // 擁有此角色的 userRoles
  userRoles: many(userRoles),
}));

// ================ Permissions ================
export const permissionsRelations = relations(permissions, ({ many }) => ({
  // 這個權限被哪些角色使用
  rolePermissions: many(rolePermissions),
}));

// ================ RolePermissions (pivot) ================
export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  })
);

// ================ UserRoles (pivot) ================
export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ================ PasswordResetTokens ================
export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);
