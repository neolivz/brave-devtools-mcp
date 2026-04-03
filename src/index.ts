/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type fs from 'node:fs';

import type {parseArguments} from './bin/brave-devtools-mcp-cli-options.js';
import {ensureBrowserConnected, ensureBrowserLaunched} from './browser.js';
import {loadIssueDescriptions} from './issue-descriptions.js';
import {logger} from './logger.js';
import {McpContext} from './McpContext.js';
import {McpResponse} from './McpResponse.js';
import {Mutex} from './Mutex.js';
import {SlimMcpResponse} from './SlimMcpResponse.js';
import {
  McpServer,
  type CallToolResult,
  SetLevelRequestSchema,
} from './third_party/index.js';
import {ToolCategory} from './tools/categories.js';
import type {DefinedPageTool, ToolDefinition} from './tools/ToolDefinition.js';
import {pageIdSchema} from './tools/ToolDefinition.js';
import {createTools} from './tools/tools.js';
import {VERSION} from './version.js';

export async function createMcpServer(
  serverArgs: ReturnType<typeof parseArguments>,
  options: {
    logFile?: fs.WriteStream;
  },
) {
  const server = new McpServer(
    {
      name: 'brave_devtools',
      title: 'Brave DevTools MCP server',
      version: VERSION,
    },
    {capabilities: {logging: {}}},
  );
  server.server.setRequestHandler(SetLevelRequestSchema, () => {
    return {};
  });

  let context: McpContext;
  async function getContext(): Promise<McpContext> {
    const braveArgs: string[] = (serverArgs.braveArg ?? []).map(String);
    const ignoreDefaultBraveArgs: string[] = (
      serverArgs.ignoreDefaultBraveArg ?? []
    ).map(String);
    if (serverArgs.proxyServer) {
      braveArgs.push(`--proxy-server=${serverArgs.proxyServer}`);
    }
    const devtools = serverArgs.experimentalDevtools ?? false;
    const browser =
      serverArgs.browserUrl || serverArgs.wsEndpoint || serverArgs.autoConnect
        ? await ensureBrowserConnected({
            browserURL: serverArgs.browserUrl,
            wsEndpoint: serverArgs.wsEndpoint,
            wsHeaders: serverArgs.wsHeaders,
            userDataDir: serverArgs.userDataDir,
            devtools,
          })
        : await ensureBrowserLaunched({
            headless: serverArgs.headless,
            executablePath: serverArgs.executablePath,
            isolated: serverArgs.isolated ?? false,
            userDataDir: serverArgs.userDataDir,
            logFile: options.logFile,
            viewport: serverArgs.viewport,
            braveArgs,
            ignoreDefaultBraveArgs,
            acceptInsecureCerts: serverArgs.acceptInsecureCerts,
            devtools,
            enableExtensions: serverArgs.categoryExtensions,
            viaCli: serverArgs.viaCli,
          });

    if (context?.browser !== browser) {
      context = await McpContext.from(browser, logger, {
        experimentalDevToolsDebugging: devtools,
        experimentalIncludeAllPages: serverArgs.experimentalIncludeAllPages,
        performanceCrux: serverArgs.performanceCrux,
      });
    }
    return context;
  }

  const toolMutex = new Mutex();

  function registerTool(tool: ToolDefinition | DefinedPageTool): void {
    if (
      tool.annotations.category === ToolCategory.EMULATION &&
      serverArgs.categoryEmulation === false
    ) {
      return;
    }
    if (
      tool.annotations.category === ToolCategory.PERFORMANCE &&
      serverArgs.categoryPerformance === false
    ) {
      return;
    }
    if (
      tool.annotations.category === ToolCategory.NETWORK &&
      serverArgs.categoryNetwork === false
    ) {
      return;
    }
    if (
      tool.annotations.category === ToolCategory.EXTENSIONS &&
      !serverArgs.categoryExtensions
    ) {
      return;
    }
    if (
      tool.annotations.category === ToolCategory.IN_PAGE &&
      !serverArgs.categoryInPageTools
    ) {
      return;
    }
    if (
      tool.annotations.conditions?.includes('computerVision') &&
      !serverArgs.experimentalVision
    ) {
      return;
    }
    if (
      tool.annotations.conditions?.includes('experimentalInteropTools') &&
      !serverArgs.experimentalInteropTools
    ) {
      return;
    }
    if (
      tool.annotations.conditions?.includes('screencast') &&
      !serverArgs.experimentalScreencast
    ) {
      return;
    }
    const schema =
      'pageScoped' in tool &&
      tool.pageScoped &&
      serverArgs.experimentalPageIdRouting &&
      !serverArgs.slim
        ? {...tool.schema, ...pageIdSchema}
        : tool.schema;

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: schema,
        annotations: tool.annotations,
      },
      async (params): Promise<CallToolResult> => {
        const guard = await toolMutex.acquire();
        try {
          logger(`${tool.name} request: ${JSON.stringify(params, null, '  ')}`);
          const context = await getContext();
          logger(`${tool.name} context: resolved`);
          await context.detectOpenDevToolsWindows();
          const response = serverArgs.slim
            ? new SlimMcpResponse(serverArgs)
            : new McpResponse(serverArgs);
          if ('pageScoped' in tool && tool.pageScoped) {
            const page =
              serverArgs.experimentalPageIdRouting &&
              params.pageId &&
              !serverArgs.slim
                ? context.getPageById(params.pageId)
                : context.getSelectedMcpPage();
            response.setPage(page);
            await tool.handler(
              {
                params,
                page,
              },
              response,
              context,
            );
          } else {
            await tool.handler(
              // @ts-expect-error types do not match.
              {
                params,
              },
              response,
              context,
            );
          }
          const {content, structuredContent} = await response.handle(
            tool.name,
            context,
          );
          const result: CallToolResult & {
            structuredContent?: Record<string, unknown>;
          } = {
            content,
          };
          if (serverArgs.experimentalStructuredContent) {
            result.structuredContent = structuredContent as Record<
              string,
              unknown
            >;
          }
          return result;
        } catch (err) {
          logger(`${tool.name} error:`, err, err?.stack);
          let errorText = err && 'message' in err ? err.message : String(err);
          if ('cause' in err && err.cause) {
            errorText += `\nCause: ${err.cause.message}`;
          }
          return {
            content: [
              {
                type: 'text',
                text: errorText,
              },
            ],
            isError: true,
          };
        } finally {
          guard.dispose();
        }
      },
    );
  }

  const tools = createTools(serverArgs);
  for (const tool of tools) {
    registerTool(tool);
  }

  await loadIssueDescriptions();

  return {server};
}

export const logDisclaimers = (args: ReturnType<typeof parseArguments>) => {
  console.error(
    `brave-devtools-mcp exposes content of the browser instance to the MCP clients allowing them to inspect,
debug, and modify any data in the browser or DevTools.
Avoid sharing sensitive or personal information that you do not want to share with MCP clients.`,
  );

  if (!args.slim && args.performanceCrux) {
    console.error(
      `Performance tools may send trace URLs to the Google CrUX API to fetch real-user experience data. To disable, run with --no-performance-crux.`,
    );
  }
};
