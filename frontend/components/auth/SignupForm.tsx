"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/libs/auth/schemas";
import { useAuthStore } from "@/store/authStore";
import { AuthInput } from "./AuthInput";
import { AuthButton } from "./AuthButton";

export function SignupForm() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (values: SignupFormValues) => {
    try {
      await signup(values);
      router.push("/feed");
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Something went wrong. Try again.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <AuthInput
        label="Full name"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <AuthInput
        label="Username"
        autoComplete="username"
        error={errors.username?.message}
        {...register("username")}
      />
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <AuthInput
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <label className="flex items-start gap-2 text-sm text-[#111111]/70">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#D7FF3F]"
          {...register("agreeToTerms")}
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="font-medium text-[#111111] underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-[#111111] underline">
            Privacy Policy
          </Link>
        </span>
      </label>
      {errors.agreeToTerms && (
        <p className="-mt-3 text-sm text-red-600">{errors.agreeToTerms.message}</p>
      )}

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <AuthButton type="submit" isLoading={isLoading}>
        Create account
      </AuthButton>

      <p className="text-center text-sm text-[#111111]/70">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#111111] underline">
          Log in
        </Link>
      </p>
    </form>
  );
}