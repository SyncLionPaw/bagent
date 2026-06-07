"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TAVILY_KEY_PATH = exports.DEFAULT_API_KEY_PATH = void 0;
exports.resolveApiKeyPath = resolveApiKeyPath;
exports.loadKey = loadKey;
exports.loadDeepSeekApiKey = loadDeepSeekApiKey;
exports.loadTavilyApiKey = loadTavilyApiKey;
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const path = __importStar(require("node:path"));
exports.DEFAULT_API_KEY_PATH = "~/.bagent/deepseek-api-key";
exports.DEFAULT_TAVILY_KEY_PATH = "~/.bagent/tavily-api-key";
function expandHome(p) {
    if (p === "~")
        return (0, node_os_1.homedir)();
    if (p.startsWith("~/"))
        return path.join((0, node_os_1.homedir)(), p.slice(2));
    return p;
}
function resolveApiKeyPath(raw, workspaceRoot) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("~"))
        return path.resolve(expandHome(trimmed));
    if (path.isAbsolute(trimmed))
        return trimmed;
    if (workspaceRoot)
        return path.join(workspaceRoot, trimmed);
    return path.resolve(trimmed);
}
function readFirstKeyLine(filePath) {
    if (!(0, node_fs_1.existsSync)(filePath))
        return undefined;
    const first = (0, node_fs_1.readFileSync)(filePath, "utf-8")
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith("#"));
    return first || undefined;
}
function loadKey(envName, filePath) {
    const fromEnv = process.env[envName]?.trim();
    if (fromEnv)
        return fromEnv;
    return readFirstKeyLine(filePath);
}
function loadDeepSeekApiKey(filePath) {
    return loadKey("DEEPSEEK_API_KEY", filePath);
}
function loadTavilyApiKey(filePath) {
    return loadKey("TAVILY_API_KEY", filePath);
}
//# sourceMappingURL=apiKey.js.map