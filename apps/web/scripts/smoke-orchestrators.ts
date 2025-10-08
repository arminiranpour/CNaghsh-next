import { fetchProfilesOrchestrated } from "@/lib/orchestrators/profiles";
import { fetchJobsOrchestrated } from "@/lib/orchestrators/jobs";

async function main() {
  const p = await fetchProfilesOrchestrated({ query: "singer", city: "tehran", page: 1 });
  console.log(
    "Profiles:",
    p.page,
    p.pageSize,
    p.appliedFilters,
    p.items.slice(0, 3).map((item) => item.id),
    p.canonical,
  );

  const j = await fetchJobsOrchestrated({ query: "actor", category: "casting", page: 1 });
  console.log(
    "Jobs:",
    j.page,
    j.pageSize,
    j.appliedFilters,
    j.items.slice(0, 3).map((item) => item.id),
    j.canonical,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
