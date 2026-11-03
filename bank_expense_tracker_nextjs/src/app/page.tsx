import { redirect } from "next/navigation";

/** The product opens on the overview. The specimen lives at /design. */
export default function HomePage() {
  redirect("/dashboard");
}
