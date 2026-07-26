import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const alex = await prisma.user.upsert({
    where: { email: "alex@codix.app" },
    update: {},
    create: {
      email: "alex@codix.app",
      passwordHash,
      fullName: "Alex Rivera",
      displayName: "Alex",
      phone: "+1 (555) 014-8821",
      bio: "Building products at Codix. Focused on clean UI and fast shipping.",
      location: "San Francisco, CA",
      timezone: "Pacific Time (PT)",
      avatarLetter: "A",
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        weeklySummary: false,
        marketingEmails: false,
        theme: "Dark",
        density: "Comfortable",
        reduceMotion: false,
        twoFactor: false,
        showOnlineStatus: true,
        publicProfile: true,
      },
    },
  });

  const users = await Promise.all(
    [
      { email: "maya@codix.app", name: "Maya Chen", letter: "M" },
      { email: "jordan@codix.app", name: "Jordan Lee", letter: "J" },
      { email: "sam@codix.app", name: "Sam Ortiz", letter: "S" },
      { email: "kai@codix.app", name: "Kai Brooks", letter: "K" },
    ].map(async (u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          passwordHash,
          fullName: u.name,
          displayName: u.name.split(" ")[0],
          avatarLetter: u.letter,
          settings: {},
        },
      })
    )
  );

  const [maya, jordan, sam, kai] = users;

  const projectsData = [
    {
      name: "Auth System",
      description: "Full authentication flow with OAuth and session management.",
      status: "COMPLETED" as const,
      progress: 100,
      color: "#ec4899",
      members: [alex.id, maya.id],
    },
    {
      name: "Mobile App API",
      description: "REST endpoints and real-time sync for the mobile client.",
      status: "IN_PROGRESS" as const,
      progress: 88,
      color: "#22c55e",
      members: [alex.id, jordan.id, sam.id],
    },
    {
      name: "Website Redesign",
      description: "New marketing site and product pages with improved performance.",
      status: "IN_PROGRESS" as const,
      progress: 72,
      color: "#6366f1",
      members: [alex.id],
    },
    {
      name: "Dashboard UI Kit",
      description: "Reusable components and design tokens for internal tools.",
      status: "IN_PROGRESS" as const,
      progress: 45,
      color: "#f59e0b",
      members: [alex.id, kai.id],
    },
    {
      name: "Analytics Pipeline",
      description: "Event tracking and reporting dashboard for product metrics.",
      status: "ON_HOLD" as const,
      progress: 20,
      color: "#8b5cf6",
      members: [maya.id],
    },
    {
      name: "Billing Integration",
      description: "Stripe subscriptions, invoices, and usage-based billing.",
      status: "IN_PROGRESS" as const,
      progress: 60,
      color: "#14b8a6",
      members: [alex.id, jordan.id],
    },
  ];

  for (const p of projectsData) {
    const existing = await prisma.project.findFirst({
      where: { name: p.name, ownerId: alex.id },
    });
    if (existing) continue;

    const project = await prisma.project.create({
      data: {
        name: p.name,
        description: p.description,
        status: p.status,
        progress: p.progress,
        color: p.color,
        ownerId: alex.id,
        members: {
          create: p.members.map((uid) => ({
            userId: uid,
            role: uid === alex.id ? "owner" : "member",
          })),
        },
      },
    });

    // Sample tasks
    const sampleTitles = [
      "Review pull request",
      "Update documentation",
      "Fix edge-case bug",
      "Write unit tests",
      "Deploy to staging",
    ];
    for (let i = 0; i < 5; i++) {
      await prisma.task.create({
        data: {
          title: `${sampleTitles[i]} – ${p.name}`,
          completed: i < Math.floor(p.progress / 25),
          tag: ["Code", "Planning", "Design", "Comm"][i % 4],
          projectId: project.id,
          userId: alex.id,
        },
      });
    }
  }

  // Today's tasks for Alex
  const todayTasks = [
    { title: "Review pull request #42", completed: true, tag: "Code" },
    { title: "Update project timeline", completed: false, tag: "Planning" },
    { title: "Prepare sprint demo slides", completed: false, tag: "Design" },
    { title: "Reply to client feedback", completed: true, tag: "Comm" },
    { title: "Fix responsive navbar bug", completed: false, tag: "Code" },
  ];

  for (const t of todayTasks) {
    const exists = await prisma.task.findFirst({
      where: { title: t.title, userId: alex.id },
    });
    if (!exists) {
      await prisma.task.create({
        data: { ...t, userId: alex.id },
      });
    }
  }

  console.log("Seed complete. Login with alex@codix.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
