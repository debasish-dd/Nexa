import { create } from "zustand";
import type { AuthUser, LoginPayload, SignupPayload } from "@/types/auth";
import {
  loginRequest,
  signupRequest,
  getCurrentUser,
  logoutRequest,
} from "@/libs/auth/api";


type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean; // true until we've checked for an existing session
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      
      const user = await loginRequest(payload);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err; // re-thrown so the form's catch block can show the message
    }
  },

  signup: async (payload) => {
    set({ isLoading: true });
    try {
      const user = await signupRequest(payload);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await logoutRequest();
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        set({ user, isAuthenticated: true });
      }
    } finally {
      set({ isInitializing: false });
    }
  },
}));