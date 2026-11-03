import { z } from "zod";

export const loginSchema = z.object({
  password: z.string().min(1, "Enter your password.").max(200),
});

export const setupFormSchema = z
  .object({
    name: z.string().trim().min(1, "Choose a name.").max(80),
    email: z.email("Enter a valid email address.").max(160),
    password: z.string().min(8, "Use at least 8 characters.").max(200),
    confirmPassword: z.string().min(1, "Confirm the password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

/** What the API accepts — the confirmation field stays in the browser. */
export const setupApiSchema = z.object({
  name: setupFormSchema.shape.name,
  email: setupFormSchema.shape.email,
  password: setupFormSchema.shape.password,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupFormInput = z.infer<typeof setupFormSchema>;
export type SetupApiInput = z.infer<typeof setupApiSchema>;
