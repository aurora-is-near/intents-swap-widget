import { promises as fs } from "node:fs";
import { resolve } from "node:path";

const src = resolve("src");
const dist = resolve("dist");

const files = await fs.readdir(src);
await fs.copyFile(resolve(src, files.find((f) => f.endsWith("theme.css"))), resolve(dist, "theme.css"));
await fs.copyFile(resolve(src, files.find((f) => f.endsWith("theme-text.css"))), resolve(dist, "theme-text.css"));
