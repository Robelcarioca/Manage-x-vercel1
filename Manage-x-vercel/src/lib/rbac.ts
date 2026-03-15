import { Role } from "@prisma/client";

export const requireRole = (role: Role, allowed: Role[]) => {
  if (!allowed.includes(role)) {
    throw new Error("FORBIDDEN");
  }
};

export const isLeadership = (role: Role) => role === Role.AMT_HEAD;
export const isChiefInstructor = (role: Role) => role === Role.CHIEF_INSTRUCTOR;
export const isMaintenance = (role: Role) => role === Role.MAINTENANCE;
