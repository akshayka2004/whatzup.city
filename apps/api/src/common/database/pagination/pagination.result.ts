export interface PaginationMeta {
  total: number;
  page?: number;
  limit: number;
  totalPages?: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string | null;
}

export class PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;

  constructor(data: T[], meta: PaginationMeta) {
    this.data = data;
    this.meta = meta;
  }

  static create<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    nextCursor?: string | null,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return new PaginatedResult(data, {
      total,
      page,
      limit,
      totalPages,
      hasNext: page * limit < total,
      hasPrev: page > 1,
      nextCursor,
    });
  }

  static createCursor<T>(
    data: T[],
    limit: number,
    nextCursorField: keyof T,
    hasMore: boolean,
  ): PaginatedResult<T> {
    const nextCursor =
      hasMore && data.length > 0 ? String(data[data.length - 1][nextCursorField]) : null;
    return new PaginatedResult(data, {
      total: data.length,
      limit,
      hasNext: hasMore,
      hasPrev: false,
      nextCursor,
    });
  }
}
