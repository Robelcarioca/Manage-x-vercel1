import prisma from "../_lib/prisma.js";
import { requireUser } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    let where = {};
    if (user.role === "CHIEF_INSTRUCTOR") where.departmentId = user.departmentId || "";
    const items = await prisma.class.findMany({ where, orderBy: { createdAt: "desc" } });
    return res.json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD", "CHIEF_INSTRUCTOR"], res)) return;
    const { name, departmentId } = req.body || {};
    if (!name || !departmentId) return res.status(400).json({ error: "Invalid data" });
    if (user.role === "CHIEF_INSTRUCTOR" && user.departmentId !== departmentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const item = await prisma.class.create({ data: { name, departmentId } });
    return res.json({ item });
  }

  res.status(405).end();
}