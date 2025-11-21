// src/repository/user.repository.ts
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users } from "../db";

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

const SALT_ROUNDS = 10;

async function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 建立一個 user（含 password hashing）
 */
export async function createUserWithPassword(input: {
  email: string;
  password: string;
  isActive?: boolean;
}) {
  const { email, password, isActive = true } = input;

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      isActive,
    })
    .returning();

  return user;
}

/**
 * 依 userId 修改密碼
 */
export async function changePassword(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);

  const [user] = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/**
 * 依 email 修改密碼（例如忘記密碼流程）
 */
export async function changePasswordByEmail(
  email: string,
  newPassword: string
) {
  const existing = await findUserByEmail(email);
  if (!existing) {
    throw new Error("User not found");
  }
  return changePassword(existing.id, newPassword);
}

/**
 * 用 email 查 user
 */
export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });
}

/**
 * 停用 / 啟用 user
 */
export async function setUserActive(userId: string, isActive: boolean) {
  const [user] = await db
    .update(users)
    .set({
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}
