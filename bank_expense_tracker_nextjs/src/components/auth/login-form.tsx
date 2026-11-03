"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginSchema, type LoginInput } from "@/validations/auth.validation";

/**
 * One password, no username — the server verifies it against the bcrypt hash
 * on the user document and sets an httpOnly cookie. Form handling is
 * react-hook-form; server outcomes become bottom-right toasts.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: LoginInput) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(body?.error ?? "Could not sign in. Try again.");
        return;
      }

      toast.success("Signed in.");
      // Replace, so the login page is not left in the history.
      router.replace(next);
      router.refresh();
    } catch {
      toast.error(
        "The server could not be reached. Check your connection and try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          aria-invalid={errors.password ? "true" : undefined}
          className="h-10"
          {...register("password")}
        />
      </Field>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="mt-5 w-full"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-4 font-mono text-[10.5px] leading-5 tracking-[0.04em] text-fg-3">
        No registration. One password protects one ledger.
      </p>
    </form>
  );
}
