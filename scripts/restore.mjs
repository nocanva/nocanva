import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const archive = process.argv[2] ? resolve(process.argv[2]) : "";
if (!archive || !existsSync(archive)) throw new Error("Usage: npm run restore -- /absolute/path/to/nocanva-backup.tar.gz");
const stateDirectory = resolve(process.env.NOCANVA_STATE_DIR ?? ".wrangler");
if (existsSync(stateDirectory)) {
  const backupDirectory = resolve(process.env.NOCANVA_BACKUP_DIR ?? "backups");
  mkdirSync(backupDirectory, { recursive: true });
  const recoveryPath = resolve(backupDirectory, `nocanva-before-restore-${Date.now()}.tar.gz`);
  execFileSync("tar", ["-czf", recoveryPath, "-C", resolve(stateDirectory, ".."), stateDirectory.split("/").at(-1) ?? ".wrangler"]);
  for (const entry of readdirSync(stateDirectory)) rmSync(resolve(stateDirectory, entry), { recursive: true, force: true });
  console.log(`Saved the previous state to ${recoveryPath}.`);
}
execFileSync("tar", ["-xzf", archive, "-C", resolve(stateDirectory, "..")]);
if (!existsSync(stateDirectory)) throw new Error("The backup did not contain the expected NoCanva state directory.");
console.log(`Restored NoCanva state from ${archive}.`);
