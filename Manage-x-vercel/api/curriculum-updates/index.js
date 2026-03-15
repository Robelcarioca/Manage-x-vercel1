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
    const items = await prisma.curriculumUpdate.findMany({
      where,
      include: { department: true, submittedBy: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["CHIEF_INSTRUCTOR", "AMT_HEAD"], res)) return;
    const { title, summary, version, departmentId } = req.body || {};
    if (!title || !summary || !version || !departmentId) {
      return res.status(400).json({ error: "Invalid data" });
    }
    if (user.role === "CHIEF_INSTRUCTOR" && user.departmentId !== departmentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const item = await prisma.curriculumUpdate.create({
      data: {
        title,
        summary,
        version,
        status: "SUBMITTED",
        departmentId,
        submittedById: user.id
      },
      include: { department: true }
    });
    const heads = await prisma.user.findMany({ where: { role: "AMT_HEAD" } });
    await Promise.all(heads.map((head) => notifyUser(head.id, "CURRICULUM_SUBMITTED", "Curriculum update submitted", item.title)));
    return res.json({ item });
  }

  res.status(405).end();
}