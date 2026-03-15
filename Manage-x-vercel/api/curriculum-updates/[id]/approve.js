import prisma from "../../_lib/prisma.js";
import { requireUser } from "../../_lib/auth.js";
import { requireRole } from "../../_lib/rbac.js";
import { notifyUser } from "../../_lib/notify.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();
  const user = await requireUser(req, res);
  if (!user) return;
  if (!requireRole(user, ["AMT_HEAD"], res)) return;

  const { action } = req.body || {};
  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const id = req.query.id;
  const status = action === "approve" ? "APPROVED" : "REJECTED";
  const item = await prisma.curriculumUpdate.update({
    where: { id },
    data: { status, approvedById: user.id }
  });
  await notifyUser(item.submittedById, "CURRICULUM_DECISION", `Curriculum ${status.toLowerCase()}`, item.title);
  res.json({ item });
}