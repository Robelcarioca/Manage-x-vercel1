import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const COOKIE_NAME = "manage_x_session";

export const hashPassword = async (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = async (password: string, hash: string) => bcrypt.compare(password, hash);

export const signToken = (payload: { userId: string; role: string }) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });

export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

export const setAuthCookie = (token: string) => {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
};

export const clearAuthCookie = () => {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
};

export const getAuthUser = async () => {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return prisma.user.findUnique({ where: { id: payload.userId } });
  } catch {
    return null;
  }
};

export const requireUser = async () => {
  const user = await getAuthUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
};
