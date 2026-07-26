import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userOrRes = await requireUser(req);
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  const [
    projectCount,
    memberCount,
    tasksDone,
    tasksTotal,
    recentProjects,
    todayTasks,
    leaderboardRaw,
  ] = await Promise.all([
    prisma.projectMember.count({ where: { userId: user.id } }),
    // Team members across projects the user is in
    prisma.projectMember
      .findMany({
        where: {
          project: { members: { some: { userId: user.id } } },
        },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((rows) => rows.length),
    prisma.task.count({ where: { userId: user.id, completed: true } }),
    prisma.task.count({ where: { userId: user.id } }),
    prisma.project.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        _count: { select: { tasks: true } },
        tasks: { where: { completed: false }, select: { id: true } },
      },
    }),
    prisma.task.findMany({
      where: { userId: user.id },
      orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    // Simple leaderboard: top users by completed tasks this "week"
    prisma.user.findMany({
      take: 5,
      orderBy: {
        tasks: { _count: "desc" },
      },
      select: {
        id: true,
        displayName: true,
        fullName: true,
        avatarLetter: true,
        _count: {
          select: { tasks: { where: { completed: true } } },
        },
      },
    }),
  ]);

  const hours = Math.round(tasksDone * 1.8);

  const projects = recentProjects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    progress: p.progress,
    color: p.color,
    tasksLeft: p.tasks.length,
    taskCount: p._count.tasks,
  }));

  const leaderboard = leaderboardRaw.map((u, i) => ({
    rank: i + 1,
    name: u.displayName || u.fullName,
    letter: u.avatarLetter || "?",
    tasksCompleted: u._count.tasks,
    score: u._count.tasks * 30, // simple points
  }));

  return NextResponse.json({
    stats: {
      projects: projectCount,
      teamMembers: memberCount,
      tasksDone,
      hours,
    },
    projects,
    tasks: todayTasks,
    leaderboard,
  });
}
