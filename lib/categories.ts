// Default spending/income categories. Free-text is also accepted at the
// transaction layer; this list just powers a quick-pick dropdown.

export const DEFAULT_CATEGORIES = [
  "Food",
  "Drinks",
  "Groceries",
  "Transport",
  "Stay",
  "Tickets",
  "Shopping",
  "Bills",
  "Misc",
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
