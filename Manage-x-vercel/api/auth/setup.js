import prisma from "../_lib/prisma.js";
import { hashPassword, setAuthCookie, signToken } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Invalid data" });
  const count = await prisma.user.count();
  if (count > 0) return res.status(400).json({ error: "Setup already completed" });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "AMT_HEAD" }
  });
  const token = signToken({ userId: user.id, role: user.role });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}