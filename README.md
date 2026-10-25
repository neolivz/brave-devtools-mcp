# Brave DevTools MCP

[![npm brave-devtools-mcp package](https://img.shields.io/npm/v/brave-devtools-mcp.svg)](https://npmjs.org/package/brave-devtools-mcp)

> **Fork of [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)** — adapted to work with [Brave Browser](https://brave.com). All credit for the original project goes to the Chrome DevTools team at Google.

`brave-devtools-mcp` lets your coding agent (such as Antigravity, Claude, Cursor or Copilot)
control and inspect a live Brave browser. It is available as a
Model-Context-Protocol (MCP) server and as a [CLI][cli]. Both give your AI
coding assistant access to the full power of DevTools for reliable
automation, in-depth debugging, and performance analysis.

[Tool reference][tool-reference] | [CLI][cli] | [Changelog][changelog] | [Contributing][contributing] | [Troubleshooting][troubleshooting] | [Design Principles][design-principles]

## Differences from chrome-devtools-mcp

- Launches Brave instead of Chrome. The Brave executable is detected
  automatically on macOS, Windows and Linux; use `--executablePath` to point at
  a different install. The Chrome-only `--channel` option is removed.
- `--autoConnect` connects to the Brave instance running with your default
  Brave profile (or the one given by `--userDataDir`).
- `--chromeArg`/`--ignoreDefaultChromeArg` are named `--braveArg`/`--ignoreDefaultBraveArg`.
- No usage statistics are collected: Google's Clearcut telemetry and the
  `--usageStatistics` option are removed.
- Binaries, environment variables, cache and config paths use the
  `brave-devtools` / `BRAVE_DEVTOOLS_MCP_` names, so the fork does not share
  state with an installed `chrome-devtools-mcp`.

The guides in [`docs/`](./docs) and the bundled [skills](./skills) are inherited
from upstream. Read `chrome-devtools-mcp` as `brave-devtools-mcp`,
`chrome-devtools` as `brave-devtools`, `CHROME_DEVTOOLS_MCP_*` as
`BRAVE_DEVTOOLS_MCP_*` and `chrome://` as `brave://` when following them.

## Key features

- **Get performance insights**: Uses [Chrome
  DevTools](https://github.com/ChromeDevTools/devtools-frontend) to record
  traces and extract actionable performance insights.
- **Advanced browser debugging**: Analyze network requests, take screenshots and
  check browser console messages (with source-mapped stack traces).
- **Reliable automation**. Uses
  [puppeteer](https://github.com/puppeteer/puppeteer) to automate actions in
  Brave and automatically wait for action results.

## Disclaimers

`brave-devtools-mcp` exposes content of the browser instance to the MCP clients
allowing them to inspect, debug, and modify any data in the browser or DevTools.
Avoid sharing sensitive or personal information that you don't want to share with
MCP clients.

`brave-devtools-mcp` targets Brave Browser. Other Chromium-based browsers may
work through `--executablePath`, but this is not guaranteed.

Performance tools may send trace URLs to the Google CrUX API to fetch real-user
experience data. This helps provide a holistic performance picture by
presenting field data alongside lab data. This data is collected by the [Chrome
User Experience Report (CrUX)](https://developer.chrome.com/docs/crux). To disable
this, run with the `--no-performance-crux` flag.

## Update checks

By default, the server periodically checks the npm registry for updates and logs a notification when a newer version is available.
You can disable these update checks by setting the `BRAVE_DEVTOOLS_MCP_NO_UPDATE_CHECKS` environment variable.

## Requirements

- [Node.js](https://nodejs.org/) [LTS](https://github.com/nodejs/Release#release-schedule) version.
- [Brave](https://brave.com/) current stable version or newer.
- [npm](https://www.npmjs.com/)

## Getting started

Add the following config to your MCP client:

```json
{
  "mcpServers": {
    "brave-devtools": {
      "command": "npx",
      "args": ["-y", "brave-devtools-mcp@latest"]
    }
  }
}
```

> [!NOTE]
> Using `brave-devtools-mcp@latest` ensures that your MCP client will always use the latest version of the Brave DevTools MCP server.

For Claude Code:

```sh
claude mcp add brave-devtools --scope user npx brave-devtools-mcp@latest
```

For other editors and agents, follow the [Client Configurations Guide][client-configurations-guide] with the config above.

### Your first prompt

Enter the following prompt in your MCP Client to check if everything is working:

```
Check the performance of https://developers.chrome.com
```

Your MCP client should open Brave and record a performance trace.

> [!NOTE]
> The MCP server will start the browser automatically once the MCP client uses a tool that requires a running browser instance. Connecting to the Brave DevTools MCP server on its own will not automatically start the browser.

## CLI

The package also includes the `brave-devtools` CLI. Use it to control the browser from your terminal without MCP:

```sh
npm i brave-devtools-mcp@latest -g
brave-devtools navigate_page 1 --url "https://developers.chrome.com"
brave-devtools take_screenshot 1 --filePath screenshot.png
brave-devtools stop
```

See the [CLI guide][cli] for all commands and options.

## Tools

If you run into any issues, checkout our [troubleshooting guide][troubleshooting].
See the full [Tool Reference][tool-reference] for a complete list of all supported MCP capabilities.

## Configuration

Find the complete list of server parameters (e.g., `--headless`, `--isolated`, `--slim`) and how to configure WebSocket connections in the [Configuration Guide][configuration-guide].

For basic browser tasks only, the `--slim` flag exposes a reduced set of tools. See the [Slim tool reference][slim-tool-reference].

### User data directory

`brave-devtools-mcp` starts Brave with the following user data directory:

- Linux / macOS: `$HOME/.cache/brave-devtools-mcp/brave-profile`
- Windows: `%HOMEPATH%/.cache/brave-devtools-mcp/brave-profile`

The user data directory is not cleared between runs and shared across
all instances of `brave-devtools-mcp`. Set the `isolated` option to `true`
to use a temporary user data dir instead which will be cleared automatically after
the browser is closed.

### Connecting to a running Brave instance

To share state between manual and agent-driven browsing, let the server connect
to the Brave you already have open:

1. In Brave, navigate to `brave://inspect/#remote-debugging` and enable remote
   debugging.
2. Start the server with `--autoConnect`:

   ```json
   {
     "mcpServers": {
       "brave-devtools": {
         "command": "npx",
         "args": ["brave-devtools-mcp@latest", "--autoConnect"]
       }
     }
   }
   ```

Brave asks for permission when the server connects. The server uses your
default Brave profile; pass `--userDataDir` to connect to Brave running with a
different user data directory.

To connect through a remote debugging port instead (for example from a
sandbox), start Brave with `--remote-debugging-port=9222` and a non-default
`--user-data-dir`, then pass `--browserUrl=http://127.0.0.1:9222`. See the
[Advanced Usage Guide][advanced-usage-guide] for details.

## Advanced Usage

For advanced features such as handling concurrent sessions, persistent user data directories, connecting to a running browser instance instead of starting a new one, or debugging on Android, see the [Advanced Usage Guide][advanced-usage-guide].

## Syncing with upstream

The `upstream` remote points at
[ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp).
Merge `upstream/main` and re-apply the Brave changes listed above to pick up
new upstream releases.

[advanced-usage-guide]: ./docs/advanced-usage.md
[changelog]: ./CHANGELOG.md
[cli]: ./docs/cli.md
[client-configurations-guide]: ./docs/client-configurations.md
[configuration-guide]: ./docs/configuration.md
[contributing]: ./CONTRIBUTING.md
[design-principles]: ./docs/design-principles.md
[slim-tool-reference]: ./docs/slim-tool-reference.md
[tool-reference]: ./docs/tool-reference.md
[troubleshooting]: ./docs/troubleshooting.md
