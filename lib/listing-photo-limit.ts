export const MAX_LISTING_PHOTOS = 20;
export function listingPhotoLimitError(existing: number, incoming: number): string | null {
  if (existing + incoming <= MAX_LISTING_PHOTOS) return null;
  const remaining = Math.max(0, MAX_LISTING_PHOTOS - existing);
  return `Each home can have up to ${MAX_LISTING_PHOTOS} photos. ${remaining ? `You can add ${remaining} more.` : 'Remove a photo before adding another.'}`;
}
