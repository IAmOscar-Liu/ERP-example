import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  jsonb,
  timestamp,
  timestamps,
} from "./core";
import {
  employmentTypeEnum,
  employeeStatusEnum,
  requestStatusEnum,
} from "./core";

// ========== Users / HR / Org ==========

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),

  // 這裡把 self reference 拿掉，避免循環推論
  parentId: uuid("parent_id"),
  // parentId: uuid("parent_id").references(() => departments.id, {
  //   onDelete: "set null",
  // }),

  headEmployeeId: uuid("head_employee_id"),
  ...timestamps,
});

export const positions = pgTable("positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  level: integer("level"),
  description: text("description"),
  ...timestamps,
});

export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  employeeNo: varchar("employee_no", { length: 50 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  hireDate: date("hire_date").notNull(),
  leaveDate: date("leave_date"),
  status: employeeStatusEnum("status").default("onboarding").notNull(),
  employmentType: employmentTypeEnum("employment_type")
    .default("full_time")
    .notNull(),

  // 這個引用 departments 沒問題（不是 self）
  departmentId: uuid("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),

  // ✅ 新增的 positionId 欄位
  positionId: uuid("position_id").references(() => positions.id, {
    onDelete: "set null",
  }),

  // 這裡同樣拿掉 self reference
  managerId: uuid("manager_id"),
  // managerId: uuid("manager_id").references(() => employees.id, {
  //   onDelete: "set null",
  // }),

  ...timestamps,
});

// ========== Onboarding (Checklists) ==========

export const onboardingTemplates = pgTable("onboarding_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  conditions: jsonb("conditions"),
  ...timestamps,
});

export const onboardingTemplateItems = pgTable("onboarding_template_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => onboardingTemplates.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  config: jsonb("config"),
  ...timestamps,
});

export const onboardingFlows = pgTable("onboarding_flows", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => onboardingTemplates.id, {
    onDelete: "set null",
  }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: requestStatusEnum("status").default("pending").notNull(),
  ...timestamps,
});

export const onboardingFlowItems = pgTable("onboarding_flow_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  flowId: uuid("flow_id")
    .notNull()
    .references(() => onboardingFlows.id, { onDelete: "cascade" }),
  templateItemId: uuid("template_item_id").references(
    () => onboardingTemplateItems.id
  ),
  titleSnapshot: varchar("title_snapshot", { length: 255 }).notNull(),
  status: requestStatusEnum("status").default("pending").notNull(),
  assigneeEmployeeId: uuid("assignee_employee_id").references(
    () => employees.id,
    { onDelete: "set null" }
  ),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  comment: text("comment"),
  ...timestamps,
});
