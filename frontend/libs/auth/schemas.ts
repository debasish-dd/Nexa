import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or username"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;


const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be under 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed");

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name is too short"),
    username: usernameSchema,
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    agreeToTerms: z
      .boolean()
      .refine((v) => v === true, "You need to accept the terms to continue"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;