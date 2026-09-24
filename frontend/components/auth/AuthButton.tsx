"use client";

import type { ButtonHTMLAttributes } from "react";

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export function AuthButton({
  isLoading,
  children,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#111111]
        px-6 py-3.5 text-[15px] font-semibold text-white transition-opacity
        hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    >
      {isLoading ? "Please wait…" : children}
    </button>
  );
}