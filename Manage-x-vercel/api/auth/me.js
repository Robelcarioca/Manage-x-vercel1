import { getAuthUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId } });
}