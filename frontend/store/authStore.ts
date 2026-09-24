import { create } from "zustand";
import type { AuthUser, LoginPayload, SignupPayload } from "@/types/auth";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => void;
};

// Placeholder store so the forms below compile and work end to end once
// you wire the two actions up to lib/auth/api.ts. You still need to decide
// how the token comes back (httpOnly cookie vs JSON body) — that decides
// whether this store ever touches a token at all, per what we discussed.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      // TODO: const user = await loginRequest(payload);
      // set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err; // re-thrown so the form's catch block can show an error
    }
  },

  signup: async (payload) => {
    set({ isLoading: true });
    try {
      // TODO: const user = await signupRequest(payload);
      // set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => set({ user: null, isAuthenticated: false }),
}));