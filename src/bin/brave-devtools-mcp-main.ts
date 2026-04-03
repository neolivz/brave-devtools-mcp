/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import '../polyfill.js';

import process from 'node:process';

import {createMcpServer, logDisclaimers} from '../index.js';
import {logger, saveLogsToFile} from '../logger.js';
import {StdioServerTransport} from '../third_party/index.js';
import {checkForUpdates} from '../utils/check-for-updates.js';
import {VERSION} from '../version.js';

import {parseArguments} from './brave-devtools-mcp-cli-options.js';

await checkForUpdates(
  'Run `npm install brave-devtools-mcp@latest` to update.',
);

export const args = parseArguments(VERSION);

const logFile = args.logFile ? saveLogsToFile(args.logFile) : undefined;

if (process.env['BRAVE_DEVTOOLS_MCP_CRASH_ON_UNCAUGHT'] !== 'true') {
  process.on('unhandledRejection', (reason, promise) => {
    logger('Unhandled promise rejection', promise, reason);
  });
}

logger(`Starting Brave DevTools MCP Server v${VERSION}`);
const {server} = await createMcpServer(args, {
  logFile,
});
const transport = new StdioServerTransport();
await server.connect(transport);
logger('Brave DevTools MCP Server connected');
logDisclaimers(args);
