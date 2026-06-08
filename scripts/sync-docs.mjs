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

const synced = new Set();

for (const name of fs.readdirSync(lessonsDir)) {
  const dir = path.join(lessonsDir, name);
  if (!fs.statSync(dir).isDirectory()) continue;

  const docPath = path.join(dir, "doc.md");
  if (!fs.existsSync(docPath)) continue;

  synced.add(`${name}.md`);
  const body = fs.readFileSync(docPath, "utf8");
  const frontmatter = `---\neditLink: ${editBase}/${name}/doc.md\n---\n\n`;
  fs.writeFileSync(path.join(chaptersDir, `${name}.md`), frontmatter + body);

  const publicDir = path.join(root, "docs", "public", "lessons", name);
  const copied = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) continue;
    fs.mkdirSync(publicDir, { recursive: true });
    fs.copyFileSync(path.join(dir, file), path.join(publicDir, file));
    copied.add(file);
  }
  if (fs.existsSync(publicDir)) {
    for (const file of fs.readdirSync(publicDir)) {
      if (!copied.has(file)) fs.unlinkSync(path.join(publicDir, file));
    }
  }
}

for (const file of fs.readdirSync(chaptersDir)) {
  if (!file.endsWith(".md") || synced.has(file)) continue;
  fs.unlinkSync(path.join(chaptersDir, file));
  console.log(`removed stale chapter: ${file}`);
}

// 安装指南截图（源文件在仓库根目录）
const installSrc = path.join(root, "install.png");
if (fs.existsSync(installSrc)) {
  fs.copyFileSync(installSrc, path.join(root, "docs", "public", "install.png"));
}

// 站点展示页截图（源文件在 lessons/51-run-command/）
const showcaseNames = ["ama.png", "foodmap.png", "swiss.png"];
const showcaseSrc = path.join(lessonsDir, "51-run-command");
const showcaseDest = path.join(root, "docs", "public", "showcase");
for (const file of showcaseNames) {
  const src = path.join(showcaseSrc, file);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(showcaseDest, { recursive: true });
  fs.copyFileSync(src, path.join(showcaseDest, file));
}

console.log(`synced ${synced.size} lessons → docs/chapters`);
