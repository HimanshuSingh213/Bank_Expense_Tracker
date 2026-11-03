"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { CATEGORIES, type TransactionDto } from "@/types/transaction";
import { parseDate } from "@/lib/utils";
import {
  editTransactionFormSchema,
  type EditTransactionFormInput,
} from "@/validations/transaction.validation";

/**
 * Edit an imported row. Import is the only way rows are created, so the
 * editable fields are the human ones — category, title, date, direction,
 * amount, narration and reference. Nothing about the import provenance
 * changes here.
 *
 * react-hook-form holds the values, zod rules the messages, the server is the
 * final judge: it re-validates and answers with the saved row.
 */

/** UTC-midnight calendar date, the exact way the row is stored. */
function isoDateOf(value: string | null): string {
  const date = parseDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

export type EditValues = EditTransactionFormInput;

export function TransactionEditForm({
  item,
  onSaved,
  onRequestClose,
}: {
  item: TransactionDto;
  onSaved: () => void;
  onRequestClose: () => void;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editTransactionFormSchema),
    defaultValues: {
      title: item.title,
      date: isoDateOf(item.txnDate),
      direction: item.direction,
      // Plain digits in the input; ₹ appears only on read-only figures.
      amount: (item.amountPaise / 100).toFixed(2),
      category: item.category,
      narration: item.narration,
      referenceNumber: item.referenceNumber ?? "",
    },
  });

  async function onSubmit(values: EditValues) {
    try {
      const response = await fetch(`/api/transactions/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          referenceNumber: values.referenceNumber || undefined,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(body?.error ?? "The row could not be saved. Try again.");
        return;
      }

      toast.success("Row saved.");
      onSaved(); // parent closes the modals
      router.refresh(); // server data becomes the truth again
    } catch {
      toast.error("The server could not be reached. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-5 py-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Title"
          htmlFor="edit-title"
          error={errors.title?.message}
          className="sm:col-span-2"
        >
          <Input
            id="edit-title"
            className="h-9"
            aria-invalid={errors.title ? "true" : undefined}
            {...register("title")}
          />
        </Field>

        <Field label="Date" htmlFor="edit-date" error={errors.date?.message}>
          <Input
            id="edit-date"
            type="date"
            className="h-9"
            aria-invalid={errors.date ? "true" : undefined}
            {...register("date")}
          />
        </Field>

        <Field label="Amount (₹)" htmlFor="edit-amount" error={errors.amount?.message}>
          <Input
            id="edit-amount"
            inputMode="decimal"
            className="h-9 font-mono"
            aria-invalid={errors.amount ? "true" : undefined}
            {...register("amount")}
          />
        </Field>

        <Field label="Type" htmlFor="edit-direction" error={errors.direction?.message}>
          <Select id="edit-direction" className="h-9" {...register("direction")}>
            <option value="debit">Money out (debit)</option>
            <option value="credit">Money in (credit)</option>
          </Select>
        </Field>

        <Field label="Category" htmlFor="edit-category" error={errors.category?.message}>
          <Select id="edit-category" className="h-9" {...register("category")}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Narration"
          htmlFor="edit-narration"
          hint="What the statement said, in one line."
          error={errors.narration?.message}
          className="sm:col-span-2"
        >
          <Input
            id="edit-narration"
            className="h-9"
            {...register("narration")}
          />
        </Field>

        <Field
          label="Reference"
          htmlFor="edit-reference"
          hint="UTR / RRN / cheque no. Leave empty to unlink the dedupe key."
          error={errors.referenceNumber?.message}
        >
          <Input
            id="edit-reference"
            className="h-9 font-mono"
            {...register("referenceNumber")}
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRequestClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
