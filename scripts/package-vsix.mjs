#!/usr/bin/env node
/**
 * 把某一课的 VS Code 插件打成 .vsix（临时去掉 private、补上 publisher，打完还原 package.json）
 *
 * 用法：node scripts/package-vsix.mjs lessons/53-diff-preview
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonArg = process.argv[2];

if (!lessonArg) {
  console.error("用法: node scripts/package-vsix.mjs lessons/NN-slug");
  process.exit(1);
}

const dir = path.resolve(root, lessonArg);
const pkgPath = path.join(dir, "package.json");

if (!fs.existsSync(pkgPath)) {
  console.error(`未找到 ${pkgPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);
const release = {
  ...pkg,
  publisher: pkg.publisher ?? process.env.VSCODE_PUBLISHER ?? "bagent",
};
delete release.private;

fs.writeFileSync(pkgPath, `${JSON.stringify(release, null, 2)}\n`);

try {
  if (fs.existsSync(path.join(dir, "package-lock.json"))) {
    execSync("npm ci", { cwd: dir, stdio: "inherit" });
  } else {
    execSync("npm install", { cwd: dir, stdio: "inherit" });
  }
  execSync("npm run compile", { cwd: dir, stdio: "inherit" });
  execSync("npx --yes @vscode/vsce@latest package --allow-missing-repository", {
    cwd: dir,
    stdio: "inherit",
  });
  const vsix = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".vsix"))
    .sort()
    .at(-1);
  if (vsix) {
    console.log(`\n→ ${path.join(dir, vsix)}`);
    console.log("\n安装：扩展面板 ⋯ → 从 VSIX 安装…");
    console.log("或：cursor --install-extension " + path.join(dir, vsix));
  }
} finally {
  fs.writeFileSync(pkgPath, raw);
}
