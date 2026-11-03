# Design system — "Statement"

**Status: approved 2 November 2026. This is the design law for every screen in this app.**
Do not introduce new colours, fonts, radii, shadows, or accents without asking the user first.

Source of truth for the implementation is `src/app/globals.css` (tokens, `.figure`, `.amount`,
`.label`, `.panel`, `.check`, focus and selection rules) and `src/components/ui/*`. This document
explains the reasoning so a future change does not quietly undo it.

---

## 1. The idea

A statement, not a dashboard. True black, white ink, figures that align in columns.
Colour appears only where it carries meaning.

The direction was chosen after rejecting a first draft that was, in the user's words, "dull with
less contrast". Research into why AI-generated interfaces look generated (impeccable.style/slop,
agent-design.com, and two design field guides) named the same tells the first draft had:

| Tell | Why it reads as generated |
|---|---|
| Neutral grotesque body + "editorial" serif display | "Serif = premium" is a reflex, not a decision |
| Inter / Geist / Space Grotesk / Instrument | The most over-used defaults in generated UI |
| Grey 1px border on every card | The single loudest layout tell |
| Purple-to-blue gradients | Wallpaper, never meaning |
| Neon on dark, coloured glow, glass | Decoration standing in for hierarchy |
| Rounded 12–16px cards | Turns a ledger into a marketing page |
| Emoji as icons | Signals throwaway work |

Contrast was therefore raised through **value and type**, never through a brighter accent.

---

## 2. Tokens (copy exactly)

```css
:root {
  color-scheme: dark;

  /* Surfaces — true black (OLED); panels lift by value, never by border */
  --bg: #000000;
  --bg-deep: #000000;
  --surface: #060606;
  --surface-2: #0d0d0d;
  --surface-3: #161616;

  /* Rules — structural hairlines only, never card outlines */
  --line-soft: #141414;
  --line: #242424;
  --line-strong: #3a3a3a;
  --line-control: #666666;   /* interactive edges — WCAG 1.4.11, 3.7:1 */

  /* Ink */
  --fg: #ffffff;             /* 21:1 on black */
  --fg-2: #cbcbc6;           /* 12.9:1 */
  --fg-3: #9d9d97;           /* 7.7:1 — still AAA at 10.5px */
  --fg-inverse: #000000;

  /* Money direction — the only saturated colour in the product */
  --credit: #40d18d;         /* 10.7:1 */
  --debit: #ff6f5e;          /* 7.7:1 */
  --warning: #f5b841;        /* 11.8:1 */

  --radius: 2px;
}
```

There is **no accent token**. `--accent*` and `--bone-dim` were deliberately removed. If a new
feature seems to need a brand colour, it does not — use white, or one of the three signals.

Measured contrast on `--surface` (#060606): white 20.3 · `--fg-2` 12.4 · `--fg-3` 7.4 ·
credit 10.4 · debit 7.4 · warning 11.4. On `--surface-2`: 19.4 / 11.9 / 7.1 / 9.9 / 7.1 / 10.9.

### Token usage rules

| Token | Use it for | Never use it for |
|---|---|---|
| `--bg` | page background | panels |
| `--surface` | panels, the app shell rail | page background |
| `--surface-2` | inputs, badges, hover fill | large panels |
| `--surface-3` | skeleton blocks, inert placeholders | text |
| `--line-soft` | table row dividers | anything interactive |
| `--line` | section rules, table header rule | input borders |
| `--line-strong` | selected/inverted edges | body text |
| `--line-control` | input, outlined button, checkbox edges | decorative dividers |
| `--fg` | primary text, the balance, the only filled button | secondary text |
| `--fg-2` | body copy, table values | labels |
| `--fg-3` | labels, meta, secondary metadata | primary figures |
| `--credit` / `--debit` | money direction only | links, buttons, focus |
| `--warning` | a decision waiting for the user | decoration |

---

## 3. Typography

Two cuts of one superfamily, loaded with `next/font`:

| Face | Variable | Role |
|---|---|---|
| **IBM Plex Sans** | `--font-ui` | prose, headings, standalone figures |
| **IBM Plex Mono** | `--font-code` | anything that lines up in a column |

Subsets: **`["latin", "latin-ext"]`** for both. The rupee sign (U+20B9) exists **only** in
`latin-ext`; this was verified by reading the compiled `woff2` cmaps. Instrument Sans/Serif were
rejected earlier because they contain no ₹ glyph at all.

**The rule that matters:** mono sets what must align (table figures, dates, references,
micro-labels); sans 600 at −0.03em sets what stands alone (the balance), because a display figure
must read as one mass, not as a row of characters. This was decided by rendering both at 52px side
by side — mono at display size reads like a receipt.

| Utility | Definition | Used for |
|---|---|---|
| `.label` | mono 10.5px / 500 / 0.16em / uppercase | eyebrows, column headers |
| `.figure` | mono, tabular + lining numerals | table data, dates, refs, meta |
| `.amount` | sans 600, tabular, −0.03em | the balance and other display figures |

Type scale: label 10.5 · meta 11 · table 13 · body 14 · section 19 · page title 30 · display
figure 50–60. Never introduce a third typeface, and never a serif.

---

## 4. Shape and depth

- **Radii: 2px everywhere.** No `rounded-md`, no pills, no 12–16px cards.
- **One border weight: 1px.** No 2px frames.
- **No shadows** except the dialog overlay scrim.
- **Panels have no border, no radius, no shadow.** A panel is a value lift to `--surface`.
  Separation comes from spacing and hairlines used as *structural rules* (table rows, section
  dividers), never as an outline around a block.
- **Exactly one filled control exists:** the primary button — white fill, black label. Every other
  button is an outline or a ghost. If two things on a screen are white-filled, one is wrong.
- **Interaction is white:** focus ring, selection, the active nav rule. Nothing else in the
  interface changes colour on hover beyond value.
- **Money is never colour-only.** Amounts carry `+`/`−`, and rows state `Debit`/`Credit` where
  space allows. Colour is reinforcement, not the signal.

---

## 5. Interaction details (these were bugs once)

- **Focus ring:** `2px solid var(--fg)`, `2px` offset, everywhere, and `transition: none` inside
  `:focus-visible`. Do **not** put `outline-color` in a transition — it fades in from black and
  the first frames are invisible.
- **Selection** inverts to white-on-black (`::selection`).
- **Inputs** use `border-line-control`; invalid inputs are driven by `aria-[invalid=true]` so the
  error colour wins the cascade regardless of class order. Do not hand-write `border-debit`.
- **Disabled buttons** use per-variant colours (`bg-surface-2` + `text-line-control`), never
  whole-control `opacity`, which makes the label unreadable and looks like a fourth fill.
- `prefers-reduced-motion` removes transitions.

---

## 6. Responsive table pattern

The table is the product, so it is specified once:

- Columns: `Date | Narration & reference | Category | Type | Amount | Balance`.
- Below `sm`, the **date column is dropped** and the date moves into the narration's mono meta
  line (`31 Oct · REF 412345678901`). Narration clamps to two lines; the amount stays visible.
- Direction is written (`CREDIT` / `DEBIT` with an arrow), not just coloured.
- All figures are `.figure` so they align down the column with no padding guesswork.

---

## 7. Adding a screen — checklist

1. Page header: title (sans 600, 26–30px) + one mono meta line + at most one primary action.
2. Every figure uses `.figure` or `.amount`. No raw `font-variant-numeric` elsewhere.
3. Handles loading, empty, success, validation error, server error, and disabled/pending.
4. Empty states say what happened and offer one next action.
5. No fake financial data in production screens.
6. Contrast checked: body ≥ 7:1, labels ≥ 4.5:1, control edges ≥ 3:1.
7. Looks right at 1440, 1024 and 390 with zero horizontal overflow.
8. Keyboard: every control reachable, focus ring visible, dialog traps focus.
9. Nothing from the rejected list in §1 has crept back in.

## 8. Live reference

`/design` is a specimen page proving every token, control and composition (`noindex`).
Read it before inventing a new
component — the pattern is almost certainly already there.
