// src/repository/department.repository.ts
import { eq } from "drizzle-orm";
import { db, departments } from "../db";

export type DepartmentRow = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export async function listDepartments() {
  return db.query.departments.findMany({
    orderBy: (t, { asc }) => asc(t.code),
    with: {
      employees: true,
      headEmployee: true,
    },
  });
}

export async function getDepartmentById(id: string) {
  return db.query.departments.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      employees: true,
      headEmployee: true,
    },
  });
}

export async function listRootDepartments() {
  return db.query.departments.findMany({
    where: (t, { isNull }) => isNull(t.parentId),
    orderBy: (t, { asc }) => asc(t.code),
  });
}

export async function createDepartment(payload: NewDepartment) {
  const [row] = await db.insert(departments).values(payload).returning();
  return row;
}

export async function updateDepartment(
  id: string,
  payload: Partial<NewDepartment>
) {
  const [row] = await db
    .update(departments)
    .set(payload)
    .where(eq(departments.id, id))
    .returning();
  return row;
}
