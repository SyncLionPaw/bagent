#!/usr/bin/env node
/** 把第 32 课打成 .vsix（临时去掉 private、补上 publisher，打完还原 package.json） */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "lessons/32-vscode-auxiliarybar");
const pkgPath = path.join(dir, "package.json");

const raw = fs.readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);
const release = { ...pkg, publisher: pkg.publisher ?? process.env.VSCODE_PUBLISHER ?? "bagent" };
delete release.private;

fs.writeFileSync(pkgPath, `${JSON.stringify(release, null, 2)}\n`);

try {
  execSync("npm run compile", { cwd: dir, stdio: "inherit" });
  execSync("npx --yes @vscode/vsce@latest package --allow-missing-repository", {
    cwd: dir,
    stdio: "inherit",
  });
  const vsix = fs.readdirSync(dir).find((f) => f.endsWith(".vsix"));
  if (vsix) console.log(`\n→ ${path.join(dir, vsix)}`);
} finally {
  fs.writeFileSync(pkgPath, raw);
}
