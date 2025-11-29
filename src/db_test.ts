import "dotenv/config";
import { sql } from "drizzle-orm";
import {
  db,
  users,
  departments,
  employees,
  leaveTypes,
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "./db";

// -------------------------------------------------------
// 1. Reset / wipe all data
// -------------------------------------------------------
async function resetDatabase() {
  console.log("Resetting database (TRUNCATE ALL TABLES)...");

  // 依照 schema 中的實際 table name
  await db.execute(sql`
    TRUNCATE TABLE
      user_roles,
      role_permissions,
      password_reset_tokens,
      payroll_preview_items,
      payroll_previews,
      payroll_item_defs,
      comp_time_transactions,
      comp_time_balances,
      overtime_requests,
      leave_requests,
      leave_types,
      attendance_corrections,
      time_clock_records,
      attendance_days,
      shift_change_requests,
      shift_schedules,
      shift_types,
      onboarding_flow_items,
      onboarding_flows,
      onboarding_template_items,
      onboarding_templates,
      employees,
      positions,
      departments,
      users,
      roles,
      permissions
    RESTART IDENTITY CASCADE;
  `);

  console.log("Database reset complete.");
}

// -------------------------------------------------------
// 2. Seed common leave types (含補休 COMP)
// -------------------------------------------------------
async function seedLeaveTypes() {
  console.log("Seeding leave types...");

  const commonTypes = [
    {
      code: "SL",
      name: "Sick Leave",
      paid: true,
    },
    {
      code: "AL",
      name: "Annual Leave",
      paid: true,
    },
    {
      code: "PL",
      name: "Personal Leave",
      paid: false,
    },
    {
      code: "ML",
      name: "Marriage Leave",
      paid: true,
    },
    {
      code: "FL",
      name: "Funeral Leave",
      paid: true,
    },
    {
      code: "MATL",
      name: "Maternity Leave",
      paid: true,
    },
    {
      code: "PATL",
      name: "Paternity Leave",
      paid: true,
    },
    {
      code: "OL",
      name: "Official Leave",
      paid: true,
    },
    // ⭐ 補休
    {
      code: "COMP",
      name: "Compensatory Leave",
      paid: false,
    },
  ];

  // 因為前面已經 TRUNCATE，所以這裡直接 insert 即可
  await db.insert(leaveTypes).values(commonTypes);

  console.log("Leave types seeding complete.");
}

// -------------------------------------------------------
// 3. Seed roles & permissions
//    - ADMIN: 不綁任何 permission，由程式邏輯視為全權
//    - HR_MANAGER: 有 LEAVE_REVIEW + OVERTIME_REVIEW
//    - REVIEWER: 也有這兩個 permission
// -------------------------------------------------------
async function seedRolesAndPermissions() {
  console.log("Seeding roles & permissions...");

  // Roles
  const [adminRole] = await db
    .insert(roles)
    .values({
      code: "ADMIN",
      name: "Administrator",
      description: "System administrator (has all permissions via code logic)",
    })
    .returning();

  const [hrRole] = await db
    .insert(roles)
    .values({
      code: "HR_MANAGER",
      name: "HR Manager",
      description: "HR manager who can manage HR-related configurations",
    })
    .returning();

  const [reviewerRole] = await db
    .insert(roles)
    .values({
      code: "REVIEWER",
      name: "Request Reviewer",
      description: "Can review leave and overtime requests",
    })
    .returning();

  console.log("Inserted roles:", {
    adminRole,
    hrRole,
    reviewerRole,
  });

  // Permissions
  const [leaveReviewPerm] = await db
    .insert(permissions)
    .values({
      code: "LEAVE_REVIEW",
      name: "Review leave requests",
      module: "leave",
    })
    .returning();

  const [overtimeReviewPerm] = await db
    .insert(permissions)
    .values({
      code: "OVERTIME_REVIEW",
      name: "Review overtime requests",
      module: "overtime",
    })
    .returning();

  console.log("Inserted permissions:", {
    leaveReviewPerm,
    overtimeReviewPerm,
  });

  // Role → Permission mapping
  // ADMIN 不綁，透過程式邏輯視為 superuser
  await db.insert(rolePermissions).values([
    // HR_MANAGER
    {
      roleId: hrRole.id,
      permissionId: leaveReviewPerm.id,
    },
    {
      roleId: hrRole.id,
      permissionId: overtimeReviewPerm.id,
    },
    // REVIEWER
    {
      roleId: reviewerRole.id,
      permissionId: leaveReviewPerm.id,
    },
    {
      roleId: reviewerRole.id,
      permissionId: overtimeReviewPerm.id,
    },
  ]);

  console.log("Role-permission mapping complete.");
}

// -------------------------------------------------------
// 4. Create ENG department + 3 employees (each with user)
//    - admin: has ADMIN role
//    - hr:   has HR_MANAGER role
//    - staff: no roles
// -------------------------------------------------------
async function seedDepartmentAndEmployees() {
  console.log("Creating ENG department and sample employees...");

  // 1) Department
  const [dept] = await db
    .insert(departments)
    .values({
      code: "ENG",
      name: "Engineering",
    })
    .returning();

  console.log("Created department:", dept);

  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  // 2) Users
  // ⚠️ passwordHash 這裡只是示意，你可以替換為實際 bcrypt hash
  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@example.com",
      passwordHash:
        "$2b$10$D3N/q9zLUPwguVP8THhNU.MNUxtYTsv1vZPbVQ2.WNvro7bfYGZSi",
    })
    .returning();

  const [hrUser] = await db
    .insert(users)
    .values({
      email: "hr@example.com",
      passwordHash:
        "$2b$10$D3N/q9zLUPwguVP8THhNU.MNUxtYTsv1vZPbVQ2.WNvro7bfYGZSi",
    })
    .returning();

  const [staffUser] = await db
    .insert(users)
    .values({
      email: "staff@example.com",
      passwordHash:
        "$2b$10$D3N/q9zLUPwguVP8THhNU.MNUxtYTsv1vZPbVQ2.WNvro7bfYGZSi",
    })
    .returning();

  // 3) Employees
  const [adminEmp] = await db
    .insert(employees)
    .values({
      userId: adminUser.id,
      employeeNo: "E0001",
      fullName: "Admin User",
      email: adminUser.email,
      hireDate: todayStr,
      departmentId: dept.id,
    })
    .returning();

  const [hrEmp] = await db
    .insert(employees)
    .values({
      userId: hrUser.id,
      employeeNo: "E0002",
      fullName: "HR User",
      email: hrUser.email,
      hireDate: todayStr,
      departmentId: dept.id,
    })
    .returning();

  const [staffEmp] = await db
    .insert(employees)
    .values({
      userId: staffUser.id,
      employeeNo: "E0003",
      fullName: "Staff User",
      email: staffUser.email,
      hireDate: todayStr,
      departmentId: dept.id,
    })
    .returning();

  console.log("Created employees:", {
    adminEmp,
    hrEmp,
    staffEmp,
  });

  // 4) Assign roles to users
  const adminRole = await db.query.roles.findFirst({
    where: (tbl, { eq }) => eq(tbl.code, "ADMIN"),
  });
  const hrRole = await db.query.roles.findFirst({
    where: (tbl, { eq }) => eq(tbl.code, "HR_MANAGER"),
  });

  if (!adminRole || !hrRole) {
    throw new Error("Roles not found when assigning to users");
  }

  await db.insert(userRoles).values([
    {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
    {
      userId: hrUser.id,
      roleId: hrRole.id,
    },
    // staffUser: intentionally no roles
  ]);

  console.log("Assigned roles to users:", {
    adminUserId: adminUser.id,
    adminRoleCode: adminRole.code,
    hrUserId: hrUser.id,
    hrRoleCode: hrRole.code,
    staffUserId: staffUser.id,
    staffRoles: [],
  });
}

// -------------------------------------------------------
// Main
// -------------------------------------------------------
async function main() {
  console.log("=== DB RESET & SEED START ===");

  await resetDatabase();
  await seedLeaveTypes();
  await seedRolesAndPermissions();
  await seedDepartmentAndEmployees();

  console.log("=== DB RESET & SEED DONE ===");
}

main()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in db_test:", err);
    process.exit(1);
  });
