"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * A small custom select — a check mark for the chosen title, a down arrow to
 * open the list. Built by hand instead of <option> so the "new window" field
 * can live inside the same list.
 *
 * At the bottom of the list there is always an input + Add button, so the
 * first window ever can be created too.
 */
export function CalculatorWindowSelect({
  titles,
  activeTitle,
  onActivate,
  onCreate,
}: {
  titles: string[];
  activeTitle: string | null;
  onActivate: (title: string) => void;
  onCreate: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  function create() {
    const title = draftTitle.trim();
    if (!title) return;
    onCreate(title);
    setDraftTitle("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 border border-line-control bg-surface-2 px-3 py-2 text-left text-[12.5px] text-fg hover:border-fg focus-visible:outline"
      >
        <span className="flex min-w-0 items-center gap-2">
          {/* The check: shows the target every calculator pick will land in. */}
          {activeTitle ? (
            <span className="flex h-4 w-4 items-center justify-center bg-fg text-bg">
              <CheckIcon className="h-3 w-3" />
            </span>
          ) : (
            <span className="h-4 w-4 border border-line-control" />
          )}
          <span className="truncate">{activeTitle ?? "Choose a window"}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-fg-3 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-px max-h-64 w-full overflow-y-auto border border-line-control bg-surface-2"
        >
          {titles.map((title) => {
            const active = title === activeTitle;

            return (
              <li key={title}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onActivate(title);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-surface-3",
                    active ? "text-fg" : "text-fg-2",
                  )}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {active ? <CheckIcon className="h-3 w-3" /> : null}
                  </span>
                  <span className="truncate">{title}</span>
                </button>
              </li>
            );
          })}

          <li className="border-t border-line">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                create();
              }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="New window…"
                aria-label="New calculator window title"
                maxLength={40}
                className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg placeholder:text-fg-3 focus-visible:outline-none"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpen(false);
                }}
              />
              <button
                type="submit"
                disabled={!draftTitle.trim()}
                className="figure shrink-0 px-1 py-1 font-mono text-[10.5px] tracking-[0.06em] text-fg uppercase disabled:text-line-control focus-visible:outline"
              >
                Add
              </button>
            </form>
          </li>

          <li>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg"
            >
              <XIcon className="h-3 w-3" />
              Close list
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
