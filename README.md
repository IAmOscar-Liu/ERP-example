# Work Breakdown Structure (WBS) for Backend Project

## 1. Project Initialization & Shared Foundation
### 1.1 Project Skeleton & Environment
- Node.js project initialization
- Directory structure design (`db/`, `repository/`, `service/`, `controller/`, `router/`)
- Postgres + Drizzle ORM integration
- `.env` environment setup

### 1.2 Shared Library
- `lib/error.ts` – CustomError, error helpers
- `lib/general.ts` – sendJsonResponse, formatting
- `lib/token.ts` – JWT creation & verification
- `type/general.ts` – ServiceResponse, shared types
- `type/request.ts` – Request DTOs

## 2. Database Schema & Data Layer
### 2.1 DB Schema (`src/db/schema`)
- Core & Auth: users, roles, permissions
- HR: employees, departments, positions
- Attendance / Shift: shiftTypes, shiftSchedules, shiftChangeRequests, attendanceDays, timeClockRecords
- Leave / OT / CompTime: leaveTypes, leaveRequests, overtimeRequests, compTimeBalances, compTimeTransactions
- Payroll tables
- Shared enums & timestamps

### 2.2 Relations (`src/db/relations`)
- attendance.relations.ts
- leave.relations.ts
- overtime / compTime / payroll relations
- schema/index.ts export tables + relations

### 2.3 DB Initialization & Seed
- Test department/employee
- Clock test
- Seed leaveTypes incl. COMP
- (future) Seed shiftTypes, roles, permissions

## 3. Authentication & Accounts
### 3.1 Repository / Service
- employee.repository: create employee + linked user
- auth.service: register/login/change password/reset password

### 3.2 Middleware / Controller / Router
- isAuth.ts – JWT middleware
- auth.controller – login/register/password APIs
- auth.router – `/auth/login`, `/auth/register`, etc.

### 3.3 Roles & Permissions (future)
- Role/permission schema
- RBAC middleware
- API access rules

## 4. HR Module
### 4.1 Employee Repository
### 4.2 Service / Controller / Router
### 4.3 Org Structure
- department/position CRUD
- manager/role mapping

## 5. Shift System
### 5.1 Repository (`shift.repository.ts`)
- Shift Types: list/create/update
- Shift Schedules: query & upsert
- Shift Change Requests: list/create/review (with actual schedule update)

### 5.2 Service (`shift.service.ts`)
- Wraps repository logic with error handling

### 5.3 Controller & Router
- `/shift/types`
- `/shift/schedule`
- `/shift/change`, `/shift/change/review`

### 5.4 Middleware
- Validation for shift operations

## 6. Attendance Module
### 6.1 Repository (`attendance.repository.ts`)
- clock in/out
- attendance summaries
- daily attendance by department
- correction requests

### 6.2 Service / Controller / Router
### 6.3 Middleware

## 7. Leave / Overtime / CompTime System
### 7.1 Leave Module
- createLeaveRequest (overlap check, comp-time balance check)
- list/get/update
- reviewLeaveRequest (deduct comp-time)

### 7.2 Overtime Module
- create/list/update/get
- reviewOvertimeRequest (approvedHours ≤ plannedHours, earn comp time)

### 7.3 CompTime Module
- createCompTimeTransaction
- get balance & transaction list
- FIFO / expiry rules (future)

## 8. Payroll Module
- payrollItemDefs
- payrollPreviews
- payrollPreviewItems
- preview calculation logic

## 9. API Layer
### 9.1 Middleware
- isAuth.ts
- errorHandler.ts
- per-module validation middleware

### 9.2 Controller & Router Integration

## 10. Testing & Deployment
### 10.1 Testing
- db_test.ts
- Unit tests (repository/service)
- Integration tests (API scenarios)

### 10.2 Logging & Monitoring

### 10.3 Deployment
- Docker/PM2
- Environment variables
- Drizzle migrations

