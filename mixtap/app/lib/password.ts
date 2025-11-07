import { createHash, randomUUID } from "node:crypto";

export const generatePassword = () => randomUUID().replace(/-/g, "");

export const hashPassword = (password: string) =>
  createHash("sha3-512").update(password).digest("hex");
