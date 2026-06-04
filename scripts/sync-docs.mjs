#!/usr/bin/env node
// lessons 各章 doc.md → docs/chapters（VitePress 构建用）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonsDir = path.join(root, "lessons");
const chaptersDir = path.join(root, "docs", "chapters");
const editBase = "https://github.com/SyncLionPaw/bagent/edit/main/lessons";

fs.mkdirSync(chaptersDir, { recursive: true });

for (const name of fs.readdirSync(lessonsDir)) {
  const dir = path.join(lessonsDir, name);
  if (!fs.statSync(dir).isDirectory()) continue;

  const docPath = path.join(dir, "doc.md");
  if (!fs.existsSync(docPath)) continue;

  const body = fs.readFileSync(docPath, "utf8");
  const frontmatter = `---\neditLink: ${editBase}/${name}/doc.md\n---\n\n`;
  fs.writeFileSync(path.join(chaptersDir, `${name}.md`), frontmatter + body);

  const publicDir = path.join(root, "docs", "public", "lessons", name);
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) continue;
    fs.mkdirSync(publicDir, { recursive: true });
    fs.copyFileSync(path.join(dir, file), path.join(publicDir, file));
  }
}

console.log("synced lessons → docs/chapters");
