import type { Paginated } from "../../../shared/types";

type PaginateOptions = {
  page?: number;
  pageSize?: number;
};

// TODO: Chapter 2 Lesson 8 - make this helper preserve the item type from input to output.
export function paginate(
  items: any[],
  total: number,
  options: PaginateOptions = {}
): Paginated<any> {
  return {
    items,
    total,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? items.length
  };
}
