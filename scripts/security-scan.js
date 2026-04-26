#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const patterns = [
  {
    name: "Postgres connection string",
    regex: /postgres(?:ql)?:\/\/[^:\s'"]+:[^@\s'"]+@[^/\s'"]+/gi,
  },
  {
    name: "MongoDB connection string",
    regex: /mongodb(?:\+srv)?:\/\/[^:\s'"]+:[^@\s'"]+@[^/\s'"]+/gi,
  },
  {
    name: "Redis connection string",
    regex: /redis:\/\/[^:\s'"]+:[^@\s'"]+@[^/\s'"]+/gi,
  },
  {
    name: "Private key",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: "GitHub token",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g,
  },
  {
    name: "OpenAI-style API key",
    regex: /\bsk-[A-Za-z0-9_-]{32,}\b/g,
  },
];

const ignoredFiles = new Set(["package-lock.json"]);
const ignoredExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
]);

function extensionOf(file) {
  const index = file.lastIndexOf(".");
  return index === -1 ? "" : file.slice(index).toLowerCase();
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((file) => !ignoredFiles.has(file))
    .filter((file) => !ignoredExtensions.has(extensionOf(file)));
}

const findings = [];

for (const file of trackedFiles()) {
  const content = readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;

    for (const [index, line] of lines.entries()) {
      if (line.includes("placeholder") || line.includes("example.com")) {
        continue;
      }

      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          file,
          line: index + 1,
          type: pattern.name,
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found in tracked files:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} (${finding.type})`);
  }
  process.exit(1);
}

console.log("No obvious secrets found in tracked files.");
