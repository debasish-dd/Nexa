import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">
          Join Nexa.
        </h1>
        <p className="mt-2 text-[15px] text-[#111111]/70">
          Create an account to find your people.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}