import prisma from "../_lib/prisma.js";
import { requireUser } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";
import { notifyUser } from "../_lib/notify.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    let where = {};
    if (user.role === "CHIEF_INSTRUCTOR") where = { departmentId: user.departmentId || "" };
    if (user.role === "INSTRUCTOR") where = { ownerId: user.id };
    const items = await prisma.task.findMany({
      where,
      include: { department: true, owner: true, createdBy: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD", "CHIEF_INSTRUCTOR"], res)) return;
    const { title, description, deadline, departmentId, ownerId, priority } = req.body || {};
    if (!title || !description || !deadline || !departmentId || !ownerId) {
      return res.status(400).json({ error: "Invalid data" });
    }
    if (user.role === "CHIEF_INSTRUCTOR" && user.departmentId !== departmentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const task = await prisma.task.create({
      data: {
        title,
        description,
        deadline: new Date(deadline),
        priority: Number(priority) || 3,
        status: "ON_TRACK",
        departmentId,
        ownerId,
        createdById: user.id
      },
      include: { owner: true }
    });
    await notifyUser(task.ownerId, "TASK_ASSIGNED", "New task assigned", task.title);
    return res.json({ item: task });
  }

  res.status(405).end();
}