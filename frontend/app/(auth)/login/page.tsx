import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">
          Welcome back.
        </h1>
        <p className="mt-2 text-[15px] text-[#111111]/70">
          Log in to keep the conversation going.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}