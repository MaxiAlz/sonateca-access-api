export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginatedMeta;
}

export type ApiPaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

export function buildApiResponse<T>(
  data: T,
  message = 'SUCCESS',
  success = true,
): ApiResponse<T> {
  return {
    success,
    message,
    data,
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  page: number,
  limit: number,
  message = 'SUCCESS',
): ApiPaginatedResponse<T> {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

  return {
    success: true,
    message,
    data: {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    },
  };
}
