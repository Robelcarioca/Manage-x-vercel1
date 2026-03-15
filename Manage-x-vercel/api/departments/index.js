import prisma from "../_lib/prisma.js";
import { requireUser } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const items = await prisma.department.findMany({ include: { chiefInstructor: true } });
    return res.json({
      items: items.map((dept) => ({
        id: dept.id,
        name: dept.name,
        chiefInstructorName: dept.chiefInstructor?.name || null
      }))
    });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD"], res)) return;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: "Invalid data" });
    const dept = await prisma.department.create({ data: { name } });
    return res.json({ item: dept });
  }

  res.status(405).end();
}