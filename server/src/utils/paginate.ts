import type { Paginated } from "../../../shared/types";

type PaginateOptions = {
  page?: number;
  pageSize?: number;
};

export function paginate(
  items: any[],
  total: number,
  options: PaginateOptions = {},
): Paginated<any> {
  return {
    items,
    total,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? items.length,
  };
}
