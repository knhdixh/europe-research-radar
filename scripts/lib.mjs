import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export const root = path.resolve(new URL("..", import.meta.url).pathname);
export const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
export const writeJson = async (relativePath, value) => {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
};
export const normalizeUrl = (value) => {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
};
export const normalizeHtml = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/\b(?:last modified|updated|generated)\b.{0,80}/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();
export const fingerprint = (value) => createHash("sha256").update(value).digest("hex");
export const isoWeek = (date = new Date()) => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target - start) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};
