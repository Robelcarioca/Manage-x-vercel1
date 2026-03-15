import prisma from "../_lib/prisma.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const count = await prisma.user.count();
  res.json({ hasUsers: count > 0 });
}