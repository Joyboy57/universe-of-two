export const KINDS = [
  { key: "bucket", label: "Bucket list", icon: "✨", category: "outing", placeholder: "Watch a sunrise together" },
  { key: "watch", label: "Watchlist", icon: "🎬", category: "movie", placeholder: "A movie we'll both watch" },
  { key: "food", label: "Food list", icon: "🍜", category: "food", placeholder: "A dish to cook or try together" },
  { key: "custom", label: "Custom list", icon: "📝", category: "other", placeholder: "Add something" },
] as const;

export type ListKind = (typeof KINDS)[number]["key"];
export const kindInfo = (k: string) => KINDS.find((x) => x.key === k) ?? KINDS[3];

export type ListItem = { id: string; text: string; note: string | null; done: boolean; date_id: string | null };
