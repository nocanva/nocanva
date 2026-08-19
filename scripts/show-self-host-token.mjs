import { readFileSync } from "node:fs";

const match = readFileSync(".env.self-host", "utf8").match(/^NOCANVA_MCP_TOKEN=(.+)$/m);
if (!match) throw new Error("Run npm run self-host first.");
console.log(match[1]);
