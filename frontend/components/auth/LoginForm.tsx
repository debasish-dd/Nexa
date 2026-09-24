"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/auth/schemas";
import { useAuthStore } from "@/store/authStore";
import { AuthInput } from "./AuthInput";
import { AuthButton } from "./AuthButton";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values);
      router.push("/dashboard");
    } catch {
      setError("root", { message: "Wrong email or password" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <AuthInput
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <AuthInput
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-[#111111]/70">
          <input type="checkbox" className="h-4 w-4 accent-[#D7FF3F]" />
          Remember me
        </label>
        <Link href="/forgot-password" className="font-medium text-[#111111] underline">
          Forgot password?
        </Link>
      </div>

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <AuthButton type="submit" isLoading={isLoading}>
        Log in
      </AuthButton>

      <p className="text-center text-sm text-[#111111]/70">
        New to Campus?{" "}
        <Link href="/signup" className="font-semibold text-[#111111] underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}