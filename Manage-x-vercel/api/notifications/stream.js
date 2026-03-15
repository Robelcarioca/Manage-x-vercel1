import prisma from "../_lib/prisma.js";
import { getAuthUser } from "../_lib/auth.js";

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  let lastCheck = new Date();

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ id: "connected", title: "Connected", body: "Listening for notifications" });

  const interval = setInterval(async () => {
    const fresh = await prisma.notification.findMany({
      where: { userId: user.id, createdAt: { gt: lastCheck } },
      orderBy: { createdAt: "desc" }
    });
    if (fresh.length > 0) {
      lastCheck = new Date();
      fresh.reverse().forEach((note) => send(note));
    }
  }, 5000);

  req.on("close", () => {
    clearInterval(interval);
  });
}