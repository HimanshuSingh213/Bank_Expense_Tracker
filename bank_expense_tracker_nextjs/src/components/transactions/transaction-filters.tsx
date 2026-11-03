import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";
import { CATEGORIES } from "@/types/transaction";
import type { TransactionSearch } from "@/lib/transactions/query";

/**
 * Filters are a plain GET form. The URL is the state, so applying a filter is a
 * navigation and every filtered view is linkable.
 */
export function TransactionFilters({ search }: { search: TransactionSearch }) {
  const filtered =
    search.q ||
    search.category ||
    search.direction ||
    search.reviewed ||
    search.from ||
    search.to;

  return (
    <form
      action="/transactions"
      method="get"
      className="panel mb-6 px-4 py-4"
      role="search"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Field label="Search" htmlFor="filter-q">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-fg-3" />
              <Input
                id="filter-q"
                name="q"
                type="search"
                defaultValue={search.q}
                placeholder="Narration or reference"
                maxLength={80}
                className="pl-8"
              />
            </div>
          </Field>
        </div>

        <div className="lg:col-span-2">
          <Field label="Category" htmlFor="filter-category">
            <Select
              id="filter-category"
              name="category"
              defaultValue={search.category}
            >
              <option value="">All</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="lg:col-span-2">
          <Field label="Direction" htmlFor="filter-direction">
            <Select
              id="filter-direction"
              name="direction"
              defaultValue={search.direction}
            >
              <option value="">All</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </Select>
          </Field>
        </div>

        <div className="lg:col-span-2">
          <Field label="Review" htmlFor="filter-reviewed">
            <Select
              id="filter-reviewed"
              name="reviewed"
              defaultValue={search.reviewed}
            >
              <option value="">All</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="reviewed">Reviewed</option>
            </Select>
          </Field>
        </div>

        <div className="lg:col-span-2">
          <Field label="From" htmlFor="filter-from">
            <Input
              id="filter-from"
              name="from"
              type="date"
              defaultValue={search.from}
              className="figure"
            />
          </Field>
        </div>

        <div className="lg:col-span-2">
          <Field label="To" htmlFor="filter-to">
            <Input
              id="filter-to"
              name="to"
              type="date"
              defaultValue={search.to}
              className="figure"
            />
          </Field>
        </div>

        <div className="flex items-end gap-2 lg:col-span-10 lg:justify-end">
          {filtered ? (
            <Link
              href="/transactions"
              className="inline-flex h-9 items-center px-2 text-[12.5px] text-fg-3 hover:text-fg"
            >
              Reset
            </Link>
          ) : null}
          <Button type="submit">Apply filters</Button>
        </div>
      </div>
    </form>
  );
}
