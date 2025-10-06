export type City = { id: string; name: string };

export async function getCities(): Promise<City[]> {
  // TODO: replace with real list when provided
  return [
    { id: "tehran", name: "تهران" },
    { id: "isfahan", name: "اصفهان" },
    { id: "mashhad", name: "مشهد" },
  ];
}
