import { readFile } from "node:fs/promises";

const resultsPath = process.argv[2];
if (!resultsPath) throw new Error("Usage: npm run benchmark:blindspot -- path/to/results.json");

const benchmark = JSON.parse(await readFile(new URL("../benchmarks/blindspot-v1.json", import.meta.url), "utf8"));
const results = JSON.parse(await readFile(resultsPath, "utf8"));
const byId = new Map(results.results.map((result) => [result.id, result]));
const missing = benchmark.tasks.filter((task) => !byId.has(task.id));
if (missing.length) throw new Error(`Missing benchmark results: ${missing.map((task) => task.id).join(", ")}`);

const measured = benchmark.tasks.map((task) => byId.get(task.id));
const publishable = measured.filter((result) => result.publishableWithoutDesignEdits === true).length;
const publishablePercent = (publishable / measured.length) * 100;
const seconds = measured.map((result) => Number(result.humanEditSeconds)).sort((a, b) => a - b);
if (seconds.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Every result needs a non-negative humanEditSeconds number.");
const midpoint = Math.floor(seconds.length / 2);
const medianHumanSeconds = seconds.length % 2 ? seconds[midpoint] : (seconds[midpoint - 1] + seconds[midpoint]) / 2;
const compositionCounts = Object.fromEntries(Object.entries(measured.reduce((counts, result) => ({ ...counts, [result.composition]: (counts[result.composition] ?? 0) + 1 }), {})).sort());
const summary = { tasks: measured.length, publishable, publishablePercent, medianHumanSeconds, compositionCounts, passed: publishablePercent >= benchmark.success.publishableWithoutDesignEditsPercent && medianHumanSeconds < benchmark.success.medianHumanSecondsMaximum };
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
