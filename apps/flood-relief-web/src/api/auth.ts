import { api } from "./client";
import type { AdminUser } from "@/types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<{ success: true; data: LoginResponse }>("/auth/login", input);
  return data.data;
}

export async function fetchCurrentUser(): Promise<AdminUser> {
  const { data } = await api.get<{ success: true; data: AdminUser }>("/auth/me");
  return data.data;
}
