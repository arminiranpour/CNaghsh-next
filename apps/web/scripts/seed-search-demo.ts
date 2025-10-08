import { prisma } from "@/lib/prisma";

async function main() {
  // 1) Ensure a user exists
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { id: "user_demo_1", email: "demo@example.com", passwordHash: "x" },
  });

  // 2) Profile: PUBLIC + APPROVED with skills including "singer"
  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      stageName: "Ali Singer",
      firstName: "Ali",
      lastName: "Vocal",
      cityId: "tehran",
      bio: "خواننده و نوازنده با تجربه صحنه. singer / vocalist.",
      skills: ["singing", "music", "performance"],
      visibility: "PUBLIC",
      moderationStatus: "APPROVED",
      updatedAt: new Date(),
      publishedAt: new Date(),
    },
    create: {
      id: "profile_demo_1",
      userId: user.id,
      stageName: "Ali Singer",
      firstName: "Ali",
      lastName: "Vocal",
      cityId: "tehran",
      bio: "خواننده و نوازنده با تجربه صحنه. singer / vocalist.",
      skills: ["singing", "music", "performance"],
      visibility: "PUBLIC",
      moderationStatus: "APPROVED",
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 3) Job: PUBLISHED + APPROVED with title/description including "actor"
  const job = await prisma.job.upsert({
    where: { id: "job_demo_1" },
    update: {
      title: "Casting Call – Lead Actor",
      description: "دنبال بازیگر اصلی هستیم. actor needed for short film.",
      category: "casting",
      cityId: "tehran",
      payType: "paid",
      status: "PUBLISHED",
      moderation: "APPROVED",
      remote: false,
      updatedAt: new Date(),
      featuredUntil: null,
    },
    create: {
      id: "job_demo_1",
      userId: user.id,
      title: "Casting Call – Lead Actor",
      description: "دنبال بازیگر اصلی هستیم. actor needed for short film.",
      category: "casting",
      cityId: "tehran",
      payType: "paid",
      status: "PUBLISHED",
      moderation: "APPROVED",
      remote: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log({ user: user.id, profile: profile.id, job: job.id });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
