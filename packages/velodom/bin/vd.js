#!/usr/bin/env node
import { runVeloDomCli } from "../lib/cli.js";

process.exitCode = await runVeloDomCli(process.argv.slice(2));
