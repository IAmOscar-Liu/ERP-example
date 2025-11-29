import { Request } from "express";

export type RequestWithId = Request & {
  userId?: string;
};

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
