import { fetchJobsOrchestrated } from "@/lib/orchestrators/jobs";

async function main() {
  const A = await fetchJobsOrchestrated({ query: "actor", category: "casting", remote: "true", payType: "paid", page: 1, sort: "featured" });
  console.log("A:", A.page, A.pageSize, A.items.map(x=>x.id), A.canonical);

  const B = await fetchJobsOrchestrated({ city: "mashhad", payType: "unpaid", sort: "newest" });
  console.log("B:", B.page, B.pageSize, B.items.map(x=>x.id), B.canonical);
}
main().catch(e => { console.error(e); process.exit(1); });
