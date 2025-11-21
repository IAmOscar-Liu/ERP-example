// db/relations/payroll.relations.ts
import { relations } from "drizzle-orm";
import {
  payrollItemDefs,
  payrollPreviews,
  payrollPreviewItems,
  employees,
} from "../schema";

// 薪資項目定義 ↔ 預覽項目
export const payrollItemDefsRelations = relations(
  payrollItemDefs,
  ({ many }) => ({
    previewItems: many(payrollPreviewItems),
  })
);

// 薪資預覽 ↔ 員工 / 項目
export const payrollPreviewsRelations = relations(
  payrollPreviews,
  ({ one, many }) => ({
    employee: one(employees, {
      fields: [payrollPreviews.employeeId],
      references: [employees.id],
    }),
    items: many(payrollPreviewItems),
  })
);

// 預覽項目 ↔ 預覽 / 項目定義
export const payrollPreviewItemsRelations = relations(
  payrollPreviewItems,
  ({ one }) => ({
    payrollPreview: one(payrollPreviews, {
      fields: [payrollPreviewItems.payrollPreviewId],
      references: [payrollPreviews.id],
    }),
    itemDef: one(payrollItemDefs, {
      fields: [payrollPreviewItems.itemDefId],
      references: [payrollItemDefs.id],
    }),
  })
);
