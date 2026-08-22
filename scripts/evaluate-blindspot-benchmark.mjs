import { readFile } from "node:fs/promises";

const resultsPath = process.argv[2];
if (!resultsPath) throw new Error("Usage: npm run benchmark:blindspot -- path/to/results.json");

const benchmark = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1.json", import.meta.url), "utf8"));
const results = JSON.parse(await readFile(resultsPath, "utf8"));
if (!Array.isArray(results.results)) throw new Error("Benchmark results must contain a results array.");
const byId = new Map(results.results.map((result) => [result.id, result]));
if (byId.size !== results.results.length) throw new Error("Benchmark results contain duplicate task IDs.");
const missing = benchmark.tasks.filter((task) => !byId.has(task.id));
if (missing.length) throw new Error(`Missing benchmark results: ${missing.map((task) => task.id).join(", ")}`);
const unexpected = results.results.filter((result) => !benchmark.tasks.some((task) => task.id === result.id));
if (unexpected.length) throw new Error(`Unexpected benchmark results: ${unexpected.map((result) => result.id).join(", ")}`);

const measured = benchmark.tasks.map((task) => byId.get(task.id));
const rubricKeys = ["hookUnderOneSecond", "clearHierarchy", "phoneReadable", "textDensityAcceptable", "mediaCropCorrect", "unmistakablyOnBrand", "professionallyDesigned", "distinctFromRecentPosts"];
for (const task of benchmark.tasks) {
  const result = byId.get(task.id);
  if (result.composition !== task.composition) throw new Error(`${task.id} used ${result.composition}; expected ${task.composition}.`);
  if (result.format !== task.format) throw new Error(`${task.id} used ${result.format}; expected ${task.format}.`);
  if (typeof result.publishableWithoutDesignEdits !== "boolean") throw new Error(`${task.id} needs a publishableWithoutDesignEdits decision.`);
  if (!result.reviewer?.trim() || !result.notes?.trim()) throw new Error(`${task.id} needs a named reviewer and review notes.`);
  if (!Array.isArray(result.contentWarnings)) throw new Error(`${task.id} needs a contentWarnings array.`);
  if (!result.rubric || rubricKeys.some((key) => typeof result.rubric[key] !== "boolean")) throw new Error(`${task.id} needs all eight visual rubric decisions.`);
  if (!Array.isArray(result.artifacts) || result.artifacts.length !== (task.slides ?? 1)) throw new Error(`${task.id} needs one immutable or reviewed artifact per expected PNG.`);
  for (const artifact of result.artifacts) {
    if (!Number.isInteger(artifact.width) || !Number.isInteger(artifact.height) || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? "")) throw new Error(`${task.id} has incomplete artifact dimensions or SHA-256 provenance.`);
  }
  if (result.publishableWithoutDesignEdits) {
    if (result.mechanicalPassed !== true) throw new Error(`${task.id} cannot be publishable after a mechanical failure.`);
    if (result.contentWarnings.length) throw new Error(`${task.id} cannot be publishable with content warnings.`);
    if (rubricKeys.some((key) => result.rubric[key] !== true)) throw new Error(`${task.id} is publishable but failed a visual rubric item.`);
    if (!result.renderId || !result.renderWorkspaceUrl) throw new Error(`${task.id} is publishable but was not promoted to an immutable render.`);
  }
}
const publishable = measured.filter((result) => result.publishableWithoutDesignEdits === true).length;
const publishablePercent = (publishable / measured.length) * 100;
const seconds = measured.map((result) => Number(result.humanEditSeconds)).sort((a, b) => a - b);
if (seconds.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Every result needs a non-negative humanEditSeconds number.");
const midpoint = Math.floor(seconds.length / 2);
const medianHumanSeconds = seconds.length % 2 ? seconds[midpoint] : (seconds[midpoint - 1] + seconds[midpoint]) / 2;
const compositionCounts = Object.fromEntries(Object.entries(measured.reduce((counts, result) => ({ ...counts, [result.composition]: (counts[result.composition] ?? 0) + 1 }), {})).sort());
const summary = {
  tasks: measured.length,
  publishable,
  publishablePercent,
  medianHumanSeconds,
  mechanicalFailures: measured.filter((result) => result.mechanicalPassed !== true).map((result) => result.id),
  contentWarningTasks: measured.filter((result) => result.contentWarnings.length).map((result) => result.id),
  visualFailureTasks: measured.filter((result) => rubricKeys.some((key) => result.rubric[key] !== true)).map((result) => result.id),
  compositionCounts,
  passed: publishablePercent >= benchmark.success.publishableWithoutDesignEditsPercent && medianHumanSeconds < benchmark.success.medianHumanSecondsMaximum,
};
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
