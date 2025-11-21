// src/repository/employee.repository.ts
import bcrypt from "bcrypt";
import { eq, ilike } from "drizzle-orm";
import { db, employees, users } from "../db";
import { UserRow } from "./user.repository";

export type EmployeeRow = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

// ==============================
// 查詢 / CRUD
// ==============================

export interface EmployeeFilter {
  departmentId?: string;
  status?: EmployeeRow["status"];
  keyword?: string; // match name / email / employeeNo
}

export async function getEmployeeById(id: string) {
  return db.query.employees.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      department: true,
      position: true,
      manager: true,
    },
  });
}

export async function listEmployees(filter: EmployeeFilter = {}) {
  const { departmentId, status, keyword } = filter;

  return db.query.employees.findMany({
    where: (t, helpers) => {
      const conditions: any[] = [];
      if (departmentId)
        conditions.push(helpers.eq(t.departmentId, departmentId));
      if (status) conditions.push(helpers.eq(t.status, status as any));
      if (keyword) {
        const pattern = `%${keyword}%`;
        conditions.push(
          helpers.or(
            ilike(t.fullName, pattern),
            ilike(t.email, pattern),
            ilike(t.employeeNo, pattern)
          )
        );
      }
      if (conditions.length === 0) {
        // drizzle 要求 where 回傳 undefined 代表「不套條件」
        return undefined as any;
      }
      return helpers.and(...conditions);
    },
    with: {
      department: true,
      position: true,
      manager: true,
    },
    orderBy: (t, { asc }) => asc(t.fullName),
  });
}

export async function createEmployee(payload: NewEmployee) {
  const [row] = await db.insert(employees).values(payload).returning();
  return row;
}

export async function updateEmployee(
  id: string,
  payload: Partial<NewEmployee>
) {
  const [row] = await db
    .update(employees)
    .set(payload)
    .where(eq(employees.id, id))
    .returning();
  return row;
}

export async function getDirectReports(managerId: string) {
  return db.query.employees.findMany({
    where: (t, { eq }) => eq(t.managerId, managerId),
    with: {
      department: true,
      position: true,
    },
    orderBy: (t, { asc }) => asc(t.fullName),
  });
}

// ==============================
// User + Employee: 建立帳號（入職）
// ==============================

export interface CreateEmployeeWithUserInput {
  // user
  email: string;
  password: string;
  isActive?: boolean;

  // employee
  employeeNo: string;
  fullName: string;
  hireDate: string; // "YYYY-MM-DD"
  phone?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  status?: EmployeeRow["status"];
  employmentType?: EmployeeRow["employmentType"];
}

/**
 * 建立 user + employee（transaction 中）
 */
export async function createEmployeeWithUser(
  input: CreateEmployeeWithUserInput
): Promise<EmployeeRow | null> {
  const {
    email,
    password,
    isActive = true,
    employeeNo,
    fullName,
    hireDate,
    phone,
    departmentId,
    positionId,
    managerId,
    status,
    employmentType,
  } = input;

  const passwordHash = await bcrypt.hash(password, 10);

  return db.transaction(async (tx) => {
    // 1) user
    const [user] = await tx
      .insert(users)
      .values({
        email,
        passwordHash,
        isActive,
      })
      .returning();

    // 2) employee
    const [employee] = await tx
      .insert(employees)
      .values({
        employeeNo,
        fullName,
        hireDate, // string: "YYYY-MM-DD"
        email,
        phone,
        departmentId: departmentId ?? null,
        positionId: positionId ?? null,
        managerId: managerId ?? null,
        status,
        employmentType,
        userId: user.id,
      })
      .returning();

    return employee ?? null;
  });
}

// ==============================
// Auth-related repo functions
// ==============================

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * 依 email + password 嘗試登入
 * 成功回傳 user + employee，失敗回傳 null
 */
export async function loginWithEmailPassword(
  input: LoginInput
): Promise<EmployeeRow | null> {
  const { email, password } = input;

  const user = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const employee = await db.query.employees.findFirst({
    where: (t, { eq }) => eq(t.userId, user.id),
  });

  return employee ?? null;
}

export interface ChangePasswordRepoInput {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

/**
 * 變更密碼：檢查舊密碼，成功回傳 updated user，失敗回傳 null
 */
export async function changeUserPasswordById(
  input: ChangePasswordRepoInput
): Promise<UserRow | null> {
  const { userId, oldPassword, newPassword } = input;

  const user = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.id, userId),
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) return null;

  const newHash = await bcrypt.hash(newPassword, 10);

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: newHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updated;
}

export interface ResetPasswordRepoInput {
  email: string;
  newPassword: string;
}

/**
 * Reset 密碼：不檢查舊密碼，直接依 email 改密碼
 * （通常應該在 reset token 驗證後呼叫）
 */
export async function resetUserPasswordByEmail(
  input: ResetPasswordRepoInput
): Promise<UserRow | null> {
  const { email, newPassword } = input;

  const user = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  });

  if (!user) return null;

  const newHash = await bcrypt.hash(newPassword, 10);

  const [updated] = await db
    .update(users)
    .set({
      passwordHash: newHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return updated;
}
