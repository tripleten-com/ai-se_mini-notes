import axios from "axios";
import type { ApiResponse, Paginated } from "../../../shared/types";

export const http = axios.create({
  baseURL: "/api",
});

// TODO: Chapter 2 Lesson 5 - preserve the response data type with a generic return value.
export function unwrapResponse(response: ApiResponse<any>): any {
  return response.data;
}

// TODO: Chapter 2 Lesson 5 - preserve paginated item types instead of returning any.
export function unwrapPaginated(response: ApiResponse<Paginated<any>>) {
  return response.data;
}
