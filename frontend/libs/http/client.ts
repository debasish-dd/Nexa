import axios from "axios";

// A plain Error loses the HTTP status code, but some call sites need it
// (e.g. treating 401 on /auth/me as "not logged in" rather than a real
// error) — so this carries it along instead of throwing it away.
export class ApiRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set — check .env.local and restart the dev server."
  );
}

const API_VERSION = "/api/v1"; // separate from the host — versioning doesn't change per environment, so it's not something you'd want living in .env

export const http = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  withCredentials: true, // sends the httpOnly cookies, same role as fetch's credentials: 'include'
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // The request never got a response to read at all — almost always
      // CORS blocking it or the backend being unreachable, not something
      // your backend actually sent back.
      return Promise.reject(
        new ApiRequestError(
          "Could not reach the server — check CORS config or that the backend is running."
        )
      );
    }
    const message = error.response?.data?.message ?? "Something went wrong";
    return Promise.reject(new ApiRequestError(message, error.response?.status));
  }
);