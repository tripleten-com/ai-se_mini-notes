import axios from "axios";
import type { ApiResponse, Paginated } from "../../../shared/types";

export const http = axios.create({
  baseURL: "/api"
});

export function unwrapResponse<T>(response: ApiResponse<T>): T {
  return response.data;
}

export function unwrapPaginated<T>(response: ApiResponse<Paginated<T>>) {
  return response.data;
}
