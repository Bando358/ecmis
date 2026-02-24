import { PAGINATION } from "@/lib/constants";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Normalise les paramètres de pagination.
 * Retourne { skip, take, validPage, validPageSize }
 */
export function normalizePagination(params?: PaginationParams) {
  const validPage = Math.max(1, params?.page ?? 1);
  const validPageSize = Math.min(
    Math.max(1, params?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE),
    PAGINATION.MAX_PAGE_SIZE
  );
  const skip = (validPage - 1) * validPageSize;

  return { skip, take: validPageSize, validPage, validPageSize };
}

/**
 * Construit le résultat paginé à partir des données et du total.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
