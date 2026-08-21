function safeReturnPath(value: string | null, origin: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname === "/signin-with-chatgpt") return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnPath = safeReturnPath(requestUrl.searchParams.get("return_to"), requestUrl.origin);
  return Response.redirect(new URL(returnPath, requestUrl.origin), 307);
}
