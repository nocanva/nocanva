import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const stateDirectory = resolve(process.env.NOCANVA_STATE_DIR ?? ".wrangler");
if (!existsSync(stateDirectory)) throw new Error(`No NoCanva state directory exists at ${stateDirectory}.`);
const backupDirectory = resolve(process.env.NOCANVA_BACKUP_DIR ?? "backups");
mkdirSync(backupDirectory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const archive = resolve(backupDirectory, `nocanva-${stamp}.tar.gz`);
execFileSync("tar", ["-czf", archive, "-C", resolve(stateDirectory, ".."), stateDirectory.split("/").at(-1) ?? ".wrangler"]);
const sha256 = createHash("sha256").update(readFileSync(archive)).digest("hex");
writeFileSync(`${archive}.sha256`, `${sha256}  ${archive.split("/").at(-1)}\n`);
console.log(JSON.stringify({ archive, sha256 }, null, 2));
