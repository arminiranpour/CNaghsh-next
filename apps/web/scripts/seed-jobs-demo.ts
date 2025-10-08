import { prisma } from "@/lib/prisma";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "jobs-demo@example.com" },
    update: {},
    create: { id: "jobs_demo_user", email: "jobs-demo@example.com", passwordHash: "x" },
  });

  await prisma.job.upsert({
    where: { id: "job_demo_remote_paid" },
    update: {
      title: "Remote Lead Actor (Paid)",
      description: "actor needed for remote short film project (paid).",
      category: "casting",
      cityId: "tehran",
      payType: "paid",
      status: "PUBLISHED",
      moderation: "APPROVED",
      remote: true,
      updatedAt: new Date(),
    },
    create: {
      id: "job_demo_remote_paid",
      userId: user.id,
      title: "Remote Lead Actor (Paid)",
      description: "actor needed for remote short film project (paid).",
      category: "casting",
      cityId: "tehran",
      payType: "paid",
      status: "PUBLISHED",
      moderation: "APPROVED",
      remote: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.job.upsert({
    where: { id: "job_demo_city_unpaid" },
    update: {
      title: "On-site Assistant Director (Unpaid)",
      description: "assistant director on set, on-site only.",
      category: "direction",
      cityId: "mashhad",
      payType: "unpaid",
      status: "PUBLISHED",
      moderation: "APPROVED",
      remote: false,
      updatedAt: new Date(),
    },
    create: {
      id: "job_demo_city_unpaid",
      userId: user.id,
      title: "On-site Assistant Director (Unpaid)",
      description: "assistant director on set, on-site only.",
      category: "direction",
      cityId: "mashhad",
      payType: "unpaid",
      status: "PUBLISHED",
      moderation: "APPROVED",
      remote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("Seeded jobs: job_demo_remote_paid, job_demo_city_unpaid");
}

main().catch((e) => { console.error(e); process.exit(1); });
