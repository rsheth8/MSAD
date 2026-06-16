/** Client-side JSON fetch with status and shape checks. */
export async function fetchJson<T>(
  url: string,
  validate?: (body: unknown) => body is T,
): Promise<T> {
  const res = await fetch(url);
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(err);
  }
  if (validate && !validate(body)) {
    throw new Error("Unexpected response shape");
  }
  return body as T;
}
