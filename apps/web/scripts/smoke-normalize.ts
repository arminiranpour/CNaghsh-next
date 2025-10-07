import { normalizeSearchParams } from "../lib/url/normalizeSearchParams";

const result = normalizeSearchParams({
  skills: [" lighting , camera ", "editing"],
  page: "0",
  gender: "x",
  remote: "true",
  sort: "  "
});

console.log(result);
