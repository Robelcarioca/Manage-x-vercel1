import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const COOKIE_NAME = "manage_x_session";

export const hashPassword = async (password) => bcrypt.hash(password, 12);
export const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);

export const signToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
export const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

export const parseCookies = (req) => {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

export const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${isProd ? "Secure;" : ""}`;
  res.setHeader("Set-Cookie", cookie);
};

export const clearAuthCookie = (res) => {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
};

export const getAuthUser = async (req) => {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return prisma.user.findUnique({ where: { id: payload.userId } });
  } catch {
    return null;
  }
};

export const requireUser = async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
};