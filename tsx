#!/usr/bin/env node
const path = require("path");
const Module = require("module");
const registerTs = require("./tools/register-ts");

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("Usage: tsx <script.ts> [...args]");
  process.exit(1);
}

registerTs();

const scriptPath = path.resolve(argv[0]);
const scriptArgs = argv.slice(1);

process.argv = [process.argv[0], scriptPath, ...scriptArgs];

Module.runMain(scriptPath);
