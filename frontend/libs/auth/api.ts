import { http, ApiRequestError } from "@/libs/http/client";
import type { AuthUser, LoginPayload, SignupPayload } from "@/types/auth";


export async function loginRequest(payload: LoginPayload): Promise<AuthUser> {
  const res = await http.post<{ data: AuthUser }>("/auth/login", payload);
  return res.data.data;
}

export async function signupRequest(payload: SignupPayload): Promise<AuthUser> {
  const res = await http.post<{ data: AuthUser }>("/auth/register", payload);
  return res.data.data;
}


export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await http.get<{ data: AuthUser }>("/auth/me");
    return res.data.data;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) return null; // not logged in — expected
    throw err;
  }
}

export async function logoutRequest(): Promise<void> {
  await http.post("/auth/logout");
}