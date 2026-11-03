"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { setupFormSchema, type SetupFormInput } from "@/validations/auth.validation";

/**
 * The one-time owner setup, on react-hook-form with the shared zod schema.
 * On success the server has already signed the session in; failures surface
 * as a toast (bottom-right) plus inline field errors from the schema.
 */
export function SetupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormInput>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SetupFormInput) {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(body?.error ?? "The account could not be created. Try again.");
        setServerError(body?.error ?? "The account could not be created. Try again.");
        return;
      }

      toast.success(`Welcome, ${body?.name ?? ""}. Ledger opened.`);
      router.replace("/dashboard");
      router.refresh();
      // Keep the button pending so it cannot be resubmitted mid-navigation.
    } catch {
      const reason =
        "The server could not be reached. Check your connection and try again.";
      toast.error(reason);
      setServerError(reason);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
      {serverError ? (
        <p id="setup-error" className="mb-4 text-[12px] leading-5 text-debit">
          {serverError}
        </p>
      ) : null}

      <div className="space-y-4">
        <Field
          label="Name"
          htmlFor="name"
          error={errors.name?.message}
        >
          <Input
            id="name"
            autoCapitalize="words"
            autoComplete="name"
            {...register("name")}
            aria-invalid={errors.name ? "true" : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
            className="h-10"
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          hint="Used only to label the owner of this ledger."
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            aria-invalid={errors.email ? "true" : undefined}
            className="h-10"
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters."
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            aria-invalid={errors.password ? "true" : undefined}
            className="h-10"
          />
        </Field>

        <Field
          label="Confirm password"
          htmlFor="confirm-password"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            aria-invalid={errors.confirmPassword ? "true" : undefined}
            className="h-10"
          />
        </Field>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="mt-6 w-full"
      >
        {isSubmitting ? "Creating account…" : "Create account and sign in"}
      </Button>

      <p className="mt-4 font-mono text-[10.5px] leading-5 tracking-[0.04em] text-fg-3">
        This runs once. The password is bcrypt-hashed on the server and stored
        on the user document — never in the browser, never in a log.
      </p>
    </form>
  );
}
