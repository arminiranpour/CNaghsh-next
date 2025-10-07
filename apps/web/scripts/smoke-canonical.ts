import { buildCanonical } from "../lib/seo/canonical";
console.log(
  buildCanonical("/jobs", { city: "tehran", skills: ["lighting","editing"], page: 2, featured: "true" })
);
