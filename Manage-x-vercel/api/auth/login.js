import prisma from "../_lib/prisma.js";
import { setAuthCookie, signToken, verifyPassword } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Invalid credentials" });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken({ userId: user.id, role: user.role });
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}