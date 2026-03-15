import prisma from "../_lib/prisma.js";
import { requireUser, hashPassword } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  if (!requireRole(user, ["AMT_HEAD"], res)) return;
  const id = req.query.id;

  if (req.method === "PATCH") {
    const { name, email, password, departmentId } = req.body || {};
    const data = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (password) data.passwordHash = await hashPassword(password);
    if (departmentId) data.departmentId = departmentId;
    const updated = await prisma.user.update({ where: { id }, data });
    if (departmentId) {
      await prisma.department.update({ where: { id: departmentId }, data: { chiefInstructorId: updated.id } });
    }
    return res.json({ item: updated });
  }

  if (req.method === "DELETE") {
    await prisma.department.updateMany({ where: { chiefInstructorId: id }, data: { chiefInstructorId: null } });
    await prisma.user.delete({ where: { id } });
    return res.json({ ok: true });
  }

  res.status(405).end();
}