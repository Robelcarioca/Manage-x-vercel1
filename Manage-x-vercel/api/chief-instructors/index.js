import prisma from "../_lib/prisma.js";
import { requireUser, hashPassword } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD"], res)) return;
    const items = await prisma.user.findMany({ where: { role: "CHIEF_INSTRUCTOR" }, include: { department: true } });
    return res.json({
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        departmentId: u.departmentId,
        departmentName: u.department?.name || null
      }))
    });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD"], res)) return;
    const { name, email, password, departmentId } = req.body || {};
    if (!name || !email || !password || !departmentId) return res.status(400).json({ error: "Invalid data" });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already in use" });
    const passwordHash = await hashPassword(password);
    const chief = await prisma.user.create({
      data: { name, email, passwordHash, role: "CHIEF_INSTRUCTOR", departmentId }
    });
    await prisma.department.update({ where: { id: departmentId }, data: { chiefInstructorId: chief.id } });
    return res.json({ item: chief });
  }

  res.status(405).end();
}