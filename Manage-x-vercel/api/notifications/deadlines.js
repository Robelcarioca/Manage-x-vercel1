import prisma from "../_lib/prisma.js";
import { notifyUser } from "../_lib/notify.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const now = new Date();
  const windows = [30, 15, 7, 3, 1].map((days) => {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    return { days, target };
  });

  const tasks = await prisma.task.findMany({
    where: { status: { in: ["ON_TRACK", "APPROACHING"] } },
    include: { owner: true }
  });

  let sent = 0;
  for (const task of tasks) {
    for (const { days, target } of windows) {
      const diff = Math.abs(new Date(task.deadline).getTime() - target.getTime());
      if (diff < 1000 * 60 * 60 * 12) {
        await notifyUser(task.ownerId, "TASK_DEADLINE", `Task due in ${days} day(s)`, task.title);
        sent += 1;
      }
    }
  }

  res.json({ sent });
}