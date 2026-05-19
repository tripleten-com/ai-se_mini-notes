import type { Paginated } from "../../../shared/types";

type PaginateOptions = {
  page?: number;
  pageSize?: number;
};

export function paginate<T>(
  items: T[],
  total: number,
  options: PaginateOptions = {}
): Paginated<T> {
  return {
    items,
    total,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? items.length
  };
}
