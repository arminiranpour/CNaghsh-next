export type CoreWebVitalsBudget = {
  route: string;
  lcpMs: number;
  cls: number;
  inpMs: number;
};

export const CORE_WEB_VITALS_BUDGETS: CoreWebVitalsBudget[] = [
  {
    route: "/",
    lcpMs: 2500,
    cls: 0.1,
    inpMs: 200,
  },
  {
    route: "/profiles/[id]",
    lcpMs: 2500,
    cls: 0.1,
    inpMs: 200,
  },
  {
    route: "/jobs/[id]",
    lcpMs: 2500,
    cls: 0.1,
    inpMs: 200,
  },
];
