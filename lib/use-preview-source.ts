import { useEffect, useState } from 'react';

/** Keep a mounted preview on its first playable source while the catalog polls.
 * Mount a fresh preview (keyed by project) to pick up a new version or signed URL.
 */
export function usePreviewSource(url: string | undefined) {
  const [source, setSource] = useState(url);
  useEffect(() => {
    if (url) setSource(current => current || url);
  }, [url]);
  return source;
}
