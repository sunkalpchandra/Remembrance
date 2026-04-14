// source.config.ts
import { defineDocs } from "fumadocs-mdx/config/zod-3";
var { docs, meta } = defineDocs({
  dir: "content/docs"
});
export {
  docs,
  meta
};
