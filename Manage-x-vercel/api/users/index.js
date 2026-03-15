import prisma from "../_lib/prisma.js";
import { requireUser, hashPassword } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD"], res)) return;
    const items = await prisma.user.findMany({
      where: { role: { in: ["OBSERVER", "MAINTENANCE", "INSTRUCTOR"] } },
      select: { id: true, name: true, email: true, role: true, departmentId: true }
    });
    return res.json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD"], res)) return;
    const { name, email, password, role, departmentId } = req.body || {};
    if (!name || !email || !password || !role) return res.status(400).json({ error: "Invalid data" });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    const passwordHash = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: { name, email, passwordHash, role, departmentId: departmentId || null }
    });
    return res.json({ item: newUser });
  }

  res.status(405).end();
}