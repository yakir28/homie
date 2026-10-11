export const CREDIT_PACKS = [
  { credits: 600, videos: 20, price: 195, label: "Best value" },
  { credits: 300, videos: 10, price: 99, label: "Most popular" },
  { credits: 150, videos: 5, price: 49, label: "" },
  { credits: 60, videos: 2, price: 22, label: "" },
] as const;
export const POST_INTRO_PACK = { credits: 90, videos: 3, price: 20, label: "Video pack" } as const;
export const ALL_CREDIT_PACKS = [...CREDIT_PACKS, POST_INTRO_PACK] as const;
export function creditPack(value: unknown) {
  return ALL_CREDIT_PACKS.find(pack => pack.credits === value);
}
