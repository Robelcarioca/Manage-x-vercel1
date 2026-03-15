import prisma from "../_lib/prisma.js";
import { requireUser, hashPassword } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    let where = { role: "INSTRUCTOR" };
    if (user.role === "CHIEF_INSTRUCTOR") where.departmentId = user.departmentId || "";
    const items = await prisma.user.findMany({ where, select: { id: true, name: true, email: true, departmentId: true } });
    return res.json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD", "CHIEF_INSTRUCTOR"], res)) return;
    const { name, email, password, departmentId } = req.body || {};
    if (!name || !email || !password || !departmentId) return res.status(400).json({ error: "Invalid data" });
    if (user.role === "CHIEF_INSTRUCTOR" && user.departmentId !== departmentId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    const passwordHash = await hashPassword(password);
    const instructor = await prisma.user.create({
      data: { name, email, passwordHash, role: "INSTRUCTOR", departmentId }
    });
    return res.json({ item: instructor });
  }

  res.status(405).end();
}