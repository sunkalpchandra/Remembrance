// Lazily import the source and createFromSource at request time so the
// expensive fumadocs indexing logic is not executed during build.
export const GET = async (request: Request) => {
  const { source } = await import("@/lib/source");
  const { createFromSource } = await import("fumadocs-core/search/server");

  const handlers = createFromSource(source);
  // Cast to any to satisfy TypeScript about call signatures at build time
  const anyHandlers = handlers as any;

  // If createFromSource returned an object with a GET handler, call it.
  if (anyHandlers && typeof anyHandlers.GET === "function") {
    return anyHandlers.GET(request);
  }

  // If createFromSource itself returned a function, call it directly.
  if (typeof anyHandlers === "function") {
    return anyHandlers(request);
  }

  return new Response("Not found", { status: 404 });
};
