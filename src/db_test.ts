import "dotenv/config";
import { db, departments, employees, leaveTypes } from "./db";
import {
  clock,
  getAttendanceDaysForEmployee,
} from "./repository/attendance.repository";

// -------------------------------------------------------
// (NEW) Seed common leave types
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
    {
      code: "COMP",
      name: "Compensatory Leave",
      paid: false, // 補休不是薪資假，使用補休時不另外給薪
    },
  ];

  for (const t of commonTypes) {
    // Avoid duplicate seed
    const exists = await db.query.leaveTypes.findFirst({
      where: (tbl, { eq }) => eq(tbl.code, t.code),
    });

    if (!exists) {
      await db.insert(leaveTypes).values(t);
      console.log(`Inserted leave type: ${t.code} - ${t.name}`);
    } else {
      console.log(`Skipped existing leave type: ${t.code}`);
    }
  }

  console.log("Leave types seeding complete.");
}

// -------------------------------------------------------
// Main test flow
// -------------------------------------------------------
async function main() {
  console.log("=== DB TEST START ===");

  // Seed leave types
  await seedLeaveTypes();

  // 1. 建一個 Department
  console.log("Creating department...");
  const [dept] = await db
    .insert(departments)
    .values({
      code: "ENG",
      name: "Engineering",
    })
    .returning();

  console.log("Created department:", dept);

  // 2. 建一個 Employee
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  console.log("Creating employee...");
  const [emp] = await db
    .insert(employees)
    .values({
      employeeNo: "E0001",
      fullName: "Test User",
      email: "test.user@example.com",
      hireDate: todayStr,
      departmentId: dept.id,
    })
    .returning();

  console.log("Created employee:", emp);

  // 3. 打卡
  console.log("Clock in...");
  await clock({
    employeeId: emp.id,
    direction: "in",
    source: "web",
  });

  await new Promise((r) => setTimeout(r, 1000));

  console.log("Clock out...");
  await clock({
    employeeId: emp.id,
    direction: "out",
    source: "web",
  });

  // 4. 查今天出勤
  const today = todayStr;

  console.log("Fetching attendance days for employee on", today);

  const days = await getAttendanceDaysForEmployee({
    employeeId: emp.id,
    fromDate: today,
    toDate: today,
  });

  console.log("Attendance result:");
  for (const d of days) {
    console.log({
      workDate: d.workDate,
      firstInAt: d.firstInAt,
      lastOutAt: d.lastOutAt,
      workMinutes: d.workMinutes,
      status: d.status,
    });
  }

  console.log("=== DB TEST END ===");
}

seedLeaveTypes()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error in db_test:", err);
    process.exit(1);
  });
