// Every link an admin types into the template editor (hero CTA, map
// link, social links) ends up as a raw <a href> on the public booking
// page — reachable by every tenant using that template and every one
// of THEIR visitors. A `javascript:`/`data:` URI slipped in (by
// mistake, or a compromised admin account) would execute in a real
// visitor's browser the moment they click it. Only allow schemes that
// can't run script; anything else falls back to '#'.
export function safeHref(url: string | undefined | null): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // A bare "/path" or "#anchor" (no scheme at all) is also fine — only
  // an explicit dangerous scheme gets rejected.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return '#';
}
