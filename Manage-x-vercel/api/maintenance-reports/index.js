import prisma from "../_lib/prisma.js";
import { requireUser } from "../_lib/auth.js";
import { requireRole } from "../_lib/rbac.js";
import { notifyUser } from "../_lib/notify.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["AMT_HEAD", "MAINTENANCE"], res)) return;
    const items = await prisma.maintenanceReport.findMany({ include: { reporter: true }, orderBy: { createdAt: "desc" } });
    return res.json({ items });
  }

  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!requireRole(user, ["MAINTENANCE"], res)) return;
    const { title, details } = req.body || {};
    if (!title || !details) return res.status(400).json({ error: "Invalid data" });
    const report = await prisma.maintenanceReport.create({
      data: { title, details, status: "Open", reporterId: user.id },
      include: { reporter: true }
    });
    const heads = await prisma.user.findMany({ where: { role: "AMT_HEAD" } });
    await Promise.all(heads.map((head) => notifyUser(head.id, "MAINTENANCE_ALERT", "System maintenance alert", report.title)));
    return res.json({ item: report });
  }

  res.status(405).end();
}