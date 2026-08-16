import { existsSync } from "node:fs";
import {
  readdir,
  readFile,
  stat
} from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const budgets = Object.freeze({
  distTotalJsBytes: 220 * 1024,
  distLargestJsChunkBytes: 120 * 1024,
  distLargestJsChunkGzipBytes: 45 * 1024,
  packageTotalJsBytes: 450 * 1024,
  packageLargestJsModuleBytes: 40 * 1024
});

const checks = [];

if (!existsSync(path.join(root, "dist", "assets"))) {
  fail(
    "Missing dist/assets. Run npm run build before checking generated chunk budgets."
  );
}

if (!existsSync(path.join(root, "lib"))) {
  fail(
    "Missing lib. Run npm run package:build before checking package runtime budgets."
  );
}

const distFiles = existsSync(path.join(root, "dist", "assets"))
  ? await collectFiles(path.join(root, "dist", "assets"), file => (
    file.endsWith(".js")
  ))
  : [];
const packageFiles = existsSync(path.join(root, "lib"))
  ? await collectFiles(path.join(root, "lib"), file => (
    file.endsWith(".js")
  ))
  : [];

const distStats = await readStats(distFiles);
const packageStats = await readStats(packageFiles);
const packageRuntimeStats = packageStats.filter(item => (
  !isPackageToolingModule(item.file)
));

checkBudget(
  "dist total JavaScript",
  sumBytes(distStats),
  budgets.distTotalJsBytes
);
checkBudget(
  "dist largest JavaScript chunk",
  largestBytes(distStats),
  budgets.distLargestJsChunkBytes
);
checkBudget(
  "dist largest gzipped JavaScript chunk",
  largestGzipBytes(distStats),
  budgets.distLargestJsChunkGzipBytes
);
checkBudget(
  "package runtime JavaScript",
  sumBytes(packageRuntimeStats),
  budgets.packageTotalJsBytes
);
checkBudget(
  "package largest runtime JavaScript module",
  largestBytes(packageRuntimeStats),
  budgets.packageLargestJsModuleBytes
);

if (checks.some(check => !check.ok)) {
  console.error("VeloDom performance budget check failed.");
  console.error("");
  printChecks();
  process.exit(1);
}

console.log("VeloDom performance budget check passed.");
printChecks();

async function collectFiles(dir, predicate) {
  const entries = await readdir(dir, {
    withFileTypes: true
  });
  const files = await Promise.all(entries.map(async entry => {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(absolute, predicate);
    }

    return predicate(absolute) ? [absolute] : [];
  }));

  return files.flat();
}

async function readStats(files) {
  return Promise.all(files.map(async file => {
    const fileStat = await stat(file);

    return {
      file,
      bytes: fileStat.size,
      gzipBytes: gzipSync(await readFile(file)).length
    };
  }));
}

function checkBudget(name, actual, limit) {
  checks.push({
    name,
    actual,
    limit,
    ok: actual <= limit
  });
}

function sumBytes(stats) {
  return stats.reduce((total, item) => total + item.bytes, 0);
}

function largestBytes(stats) {
  return Math.max(0, ...stats.map(item => item.bytes));
}

function largestGzipBytes(stats) {
  return Math.max(0, ...stats.map(item => item.gzipBytes));
}

function isPackageToolingModule(file) {
  return /[/\\](?:cli|testing)\.js$/.test(file);
}

function printChecks() {
  checks.forEach(check => {
    const status = check.ok ? "ok" : "over";
    console.log(
      `  ${status} ${check.name}: ${formatBytes(check.actual)} / ${formatBytes(check.limit)}`
    );
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
