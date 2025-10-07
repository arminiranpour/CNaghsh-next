import { runJobSearch } from "@/lib/search/runJobSearch";
import { runProfileSearch } from "@/lib/search/runProfileSearch";

async function main() {
  const profileQueries = ["خواننده", "singer", "developer"];
  const jobQueries = ["casting", "actor", "کارگردان"];

  for (const query of profileQueries) {
    const result = await runProfileSearch({ query, pageSize: 3 });
    console.log(`Profiles for "${query}":`);
    if (result.items.length === 0) {
      console.log("  (no results)");
      continue;
    }
    for (const item of result.items) {
      const score = item.rank ?? item.sim ?? null;
      console.log(
        `  ${item.id} — ${[item.stageName, item.firstName, item.lastName]
          .filter(Boolean)
          .join(" ") || "(no name)"} — score=${score ?? "n/a"}`,
      );
    }
  }

  for (const query of jobQueries) {
    const result = await runJobSearch({ query, pageSize: 3 });
    console.log(`Jobs for "${query}":`);
    if (result.items.length === 0) {
      console.log("  (no results)");
      continue;
    }
    for (const item of result.items) {
      const score = item.rank ?? item.sim ?? null;
      console.log(
        `  ${item.id} — ${item.title} — score=${score ?? "n/a"}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
