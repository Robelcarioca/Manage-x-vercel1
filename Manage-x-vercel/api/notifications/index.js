import prisma from "../_lib/prisma.js";
import { requireUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const user = await requireUser(req, res);
  if (!user) return;
  const items = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  res.json({ items });
}