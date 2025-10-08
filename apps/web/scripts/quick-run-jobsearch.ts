import { runJobSearch } from "@/lib/search/runJobSearch";

(async () => {
  const q = await runJobSearch({
    query:'actor', category:'casting', city:'tehran',
    remote:true, payType:'paid', sort:'featured', page:1
  });
  console.log(q.items.map(i=>({ id:i.id, remote:i.remote, payType:i.payType })));
})();
