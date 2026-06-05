import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.resolve(process.argv[2]);
const cmd =
  process.platform === "darwin" ? "open" :
  process.platform === "win32" ? "start" : "xdg-open";
execSync(`${cmd} ${JSON.stringify(file)}`, { stdio: "inherit" });
