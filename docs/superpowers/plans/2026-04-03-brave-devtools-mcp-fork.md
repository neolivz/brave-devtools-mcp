# brave-devtools-mcp Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork chrome-devtools-mcp into a Brave-only MCP server called brave-devtools-mcp, with auto-detection of Brave Browser and removal of Google telemetry.

**Architecture:** Rename all Chrome references to Brave across the codebase. Replace Puppeteer's Chrome channel system with platform-specific Brave executable detection. Remove Clearcut telemetry. Update URL filters for Brave internal pages.

**Tech Stack:** TypeScript, Puppeteer, MCP SDK, Node.js

---

### Task 1: Rename bin entry point files

**Files:**
- Rename: `src/bin/chrome-devtools-mcp.ts` -> `src/bin/brave-devtools-mcp.ts`
- Rename: `src/bin/chrome-devtools-mcp-main.ts` -> `src/bin/brave-devtools-mcp-main.ts`
- Rename: `src/bin/chrome-devtools-mcp-cli-options.ts` -> `src/bin/brave-devtools-mcp-cli-options.ts`
- Rename: `src/bin/chrome-devtools.ts` -> `src/bin/brave-devtools.ts`
- Rename: `src/bin/chrome-devtools-cli-options.ts` -> `src/bin/brave-devtools-cli-options.ts`

- [ ] **Step 1: Git-rename all bin files**

```bash
git mv src/bin/chrome-devtools-mcp.ts src/bin/brave-devtools-mcp.ts
git mv src/bin/chrome-devtools-mcp-main.ts src/bin/brave-devtools-mcp-main.ts
git mv src/bin/chrome-devtools-mcp-cli-options.ts src/bin/brave-devtools-mcp-cli-options.ts
git mv src/bin/chrome-devtools.ts src/bin/brave-devtools.ts
git mv src/bin/chrome-devtools-cli-options.ts src/bin/brave-devtools-cli-options.ts
```

- [ ] **Step 2: Update internal import in `src/bin/brave-devtools-mcp.ts`**

Change the import from:
```typescript
await import('./chrome-devtools-mcp-main.js');
```
to:
```typescript
await import('./brave-devtools-mcp-main.js');
```

Also update process title:
```typescript
process.title = 'brave-devtools-mcp';
```

- [ ] **Step 3: Update imports in `src/bin/brave-devtools-mcp-main.ts`**

Change:
```typescript
import {cliOptions, parseArguments} from './chrome-devtools-mcp-cli-options.js';
```
to:
```typescript
import {cliOptions, parseArguments} from './brave-devtools-mcp-cli-options.js';
```

Also update the log line:
```typescript
logger(`Starting Brave DevTools MCP Server v${VERSION}`);
```

And the update message:
```typescript
await checkForUpdates(
  'Run `npm install brave-devtools-mcp@latest` to update.',
);
```

- [ ] **Step 4: Update imports in `src/bin/brave-devtools.ts`**

Change:
```typescript
import {commands} from './chrome-devtools-cli-options.js';
import {cliOptions, parseArguments} from './chrome-devtools-mcp-cli-options.js';
```
to:
```typescript
import {commands} from './brave-devtools-cli-options.js';
import {cliOptions, parseArguments} from './brave-devtools-mcp-cli-options.js';
```

Also update:
- `process.title = 'brave-devtools';`
- `.scriptName('brave-devtools')`
- `.usage('brave-devtools <command> [...args] --flags')`
- `.usage("Run 'brave-devtools <command> --help'...")`
- All `chrome-devtools-mcp` strings to `brave-devtools-mcp` in command descriptions and status messages
- Update check message: `'Run npm install -g brave-devtools-mcp@latest and brave-devtools start to update and restart the daemon.'`

- [ ] **Step 5: Update all cross-file imports that reference renamed files**

In `src/daemon/utils.ts`, update:
```typescript
export const INDEX_SCRIPT_PATH = path.join(
  import.meta.dirname,
  '..',
  'bin',
  'brave-devtools-mcp.js',
);
```

In `src/index.ts`, update:
```typescript
import type {parseArguments} from './bin/brave-devtools-mcp-cli-options.js';
```

In `src/McpResponse.ts`, update:
```typescript
import type {ParsedArguments} from './bin/brave-devtools-mcp-cli-options.js';
```

In `src/telemetry/flagUtils.ts`, update the import to reference the new filename.

Grep for any other imports referencing old filenames and update them.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename chrome-devtools bin files to brave-devtools"
```

---

### Task 2: Update package.json and server.json

**Files:**
- Modify: `package.json`
- Modify: `server.json`

- [ ] **Step 1: Update package.json**

Change these fields:
```json
{
  "name": "brave-devtools-mcp",
  "description": "MCP server for Brave DevTools",
  "bin": {
    "brave-devtools-mcp": "./build/src/bin/brave-devtools-mcp.js",
    "brave-devtools": "./build/src/bin/brave-devtools.js"
  }
}
```

- [ ] **Step 2: Update server.json**

```json
{
  "name": "io.github.neolivz/brave-devtools-mcp",
  "title": "Brave DevTools MCP",
  "description": "MCP server for Brave DevTools",
  "repository": {
    "url": "https://github.com/neolivz/brave-devtools-mcp",
    "source": "github"
  },
  "packages": [
    {
      "registryType": "npm",
      "registryBaseUrl": "https://registry.npmjs.org",
      "identifier": "brave-devtools-mcp"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json server.json
git commit -m "chore: rebrand package to brave-devtools-mcp"
```

---

### Task 3: Add Brave executable auto-detection in browser.ts

**Files:**
- Modify: `src/browser.ts`

- [ ] **Step 1: Add `detectBraveExecutable()` function**

Add this function to `src/browser.ts`:

```typescript
function detectBraveExecutable(): string {
  const platform = os.platform();
  let candidates: string[];

  if (platform === 'darwin') {
    candidates = [
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ];
  } else if (platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA'] ?? '';
    const programFiles = process.env['PROGRAMFILES'] ?? '';
    candidates = [
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ];
  } else {
    candidates = [
      '/usr/bin/brave-browser',
      '/usr/bin/brave',
      '/snap/bin/brave',
    ];
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Brave Browser not found. Install Brave or provide the path with --executablePath.',
  );
}
```

- [ ] **Step 2: Remove `Channel` type and channel logic**

Remove the `Channel` type export:
```typescript
// DELETE: export type Channel = 'stable' | 'canary' | 'beta' | 'dev';
```

- [ ] **Step 3: Update `ensureBrowserConnected`**

Remove the `channel` parameter from options. Remove the channel-to-puppeteer mapping logic (lines 108-114 in original). The function should only support `browserURL`, `wsEndpoint`, and `userDataDir` connection modes.

Update error messages from "Chrome" to "Brave" and `chrome://inspect` to `brave://inspect`.

Updated function signature:
```typescript
export async function ensureBrowserConnected(options: {
  browserURL?: string;
  wsEndpoint?: string;
  wsHeaders?: Record<string, string>;
  devtools: boolean;
  userDataDir?: string;
  enableExtensions?: boolean;
})
```

- [ ] **Step 4: Update `launch` function**

Replace `McpLaunchOptions` interface — remove `channel` field. Update the `launch` function:

- Remove `channel` from destructuring
- Remove `puppeteerChannel` logic
- If no `executablePath` provided, call `detectBraveExecutable()` to get it
- Change `profileDirName` to just `'brave-profile'`
- Change cache directory from `chrome-devtools-mcp` to `brave-devtools-mcp` and `chrome-devtools-mcp-cli` to `brave-devtools-mcp-cli`
- Rename `chromeArgs` to `braveArgs` and `ignoreDefaultChromeArgs` to `ignoreDefaultBraveArgs`

```typescript
interface McpLaunchOptions {
  acceptInsecureCerts?: boolean;
  executablePath?: string;
  userDataDir?: string;
  headless: boolean;
  isolated: boolean;
  logFile?: fs.WriteStream;
  viewport?: {
    width: number;
    height: number;
  };
  braveArgs?: string[];
  ignoreDefaultBraveArgs?: string[];
  devtools: boolean;
  enableExtensions?: boolean;
  viaCli?: boolean;
}
```

Updated launch body:
```typescript
export async function launch(options: McpLaunchOptions): Promise<Browser> {
  const {headless, isolated} = options;
  const profileDirName = 'brave-profile';

  let userDataDir = options.userDataDir;
  if (!isolated && !userDataDir) {
    userDataDir = path.join(
      os.homedir(),
      '.cache',
      options.viaCli ? 'brave-devtools-mcp-cli' : 'brave-devtools-mcp',
      profileDirName,
    );
    await fs.promises.mkdir(userDataDir, { recursive: true });
  }

  const executablePath = options.executablePath ?? detectBraveExecutable();

  const args: LaunchOptions['args'] = [
    ...(options.braveArgs ?? []),
    '--hide-crash-restore-bubble',
  ];
  const ignoreDefaultArgs: LaunchOptions['ignoreDefaultArgs'] =
    options.ignoreDefaultBraveArgs ?? false;

  if (headless) {
    args.push('--screen-info={3840x2160}');
  }
  if (options.devtools) {
    args.push('--auto-open-devtools-for-tabs');
  }

  if (!headless) {
    detectDisplay();
  }

  try {
    const browser = await puppeteer.launch({
      targetFilter: makeTargetFilter(options.enableExtensions),
      executablePath,
      defaultViewport: null,
      userDataDir,
      pipe: true,
      headless,
      args,
      ignoreDefaultArgs,
      acceptInsecureCerts: options.acceptInsecureCerts,
      handleDevToolsAsPage: true,
      enableExtensions: options.enableExtensions,
    });
    // ... rest stays the same, just update error message
  }
}
```

- [ ] **Step 5: Update `makeTargetFilter` for Brave URLs**

```typescript
function makeTargetFilter(enableExtensions = false) {
  const ignoredPrefixes = new Set(['chrome://', 'brave://', 'chrome-untrusted://']);
  if (!enableExtensions) {
    ignoredPrefixes.add('chrome-extension://');
  }

  return function targetFilter(target: Target): boolean {
    const url = target.url();
    if (url === 'chrome://newtab/' || url === 'brave://newtab/') {
      return true;
    }
    if (url.startsWith('chrome://inspect') || url.startsWith('brave://inspect')) {
      return true;
    }
    for (const prefix of ignoredPrefixes) {
      if (url.startsWith(prefix)) {
        return false;
      }
    }
    return true;
  };
}
```

- [ ] **Step 6: Remove `ChromeReleaseChannel` import**

Remove `ChromeReleaseChannel` from the third_party import since it's no longer needed.

- [ ] **Step 7: Commit**

```bash
git add src/browser.ts
git commit -m "feat: add Brave executable auto-detection, remove Chrome channel system"
```

---

### Task 4: Update CLI options

**Files:**
- Modify: `src/bin/brave-devtools-mcp-cli-options.ts`

- [ ] **Step 1: Remove `--channel` option**

Delete the entire `channel` option from `cliOptions`.

- [ ] **Step 2: Rename Chrome-specific options**

Rename:
- `chromeArg` -> `braveArg` (update description from "Chrome" to "Brave", from "chrome-devtools-mcp" to "brave-devtools-mcp")
- `ignoreDefaultChromeArg` -> `ignoreDefaultBraveArg` (same updates)

- [ ] **Step 3: Update all descriptions**

- `autoConnect`: Replace "Chrome 144+" with "Brave", `chrome://inspect` with `brave://inspect`
- `browserUrl`: Replace "Chrome" with "Brave", update the URL in description to point to `neolivz/brave-devtools-mcp`
- `wsEndpoint`: Replace "Chrome" with "Brave"
- `executablePath`: Change `'Path to custom Chrome executable.'` to `'Path to custom Brave executable. Auto-detected if not provided.'`
- `userDataDir`: Replace `chrome-devtools-mcp` with `brave-devtools-mcp`
- `headless`: Keep as-is
- `proxyServer`: Replace "Chrome" with "Brave"
- `braveArg`: `'Additional arguments for Brave. Only applies when Brave is launched by brave-devtools-mcp.'`
- `ignoreDefaultBraveArg`: `'Explicitly disable default arguments for Brave. Only applies when Brave is launched by brave-devtools-mcp.'`

- [ ] **Step 4: Update `parseArguments` function**

Change `.scriptName('npx brave-devtools-mcp@latest')`.

Update the `.check()` — remove the `channel` default logic. If no `browserUrl`, `wsEndpoint`, or `executablePath` is provided, that's fine — `detectBraveExecutable()` will be called at launch time.

Update all examples to replace "Chrome" with "Brave" and remove channel-specific examples. Updated examples:

```typescript
.example([
  [
    '$0 --browserUrl http://127.0.0.1:9222',
    'Connect to an existing Brave instance via HTTP',
  ],
  [
    '$0 --wsEndpoint ws://127.0.0.1:9222/devtools/browser/abc123',
    'Connect to an existing Brave instance via WebSocket',
  ],
  [
    `$0 --wsEndpoint ws://127.0.0.1:9222/devtools/browser/abc123 --wsHeaders '{"Authorization":"Bearer token"}'`,
    'Connect via WebSocket with custom headers',
  ],
  ['$0 --logFile /tmp/log.txt', 'Save logs to a file'],
  ['$0 --help', 'Print CLI options'],
  [
    '$0 --viewport 1280x720',
    'Launch Brave with the initial viewport size of 1280x720px',
  ],
  [
    `$0 --brave-arg='--no-sandbox' --brave-arg='--disable-setuid-sandbox'`,
    'Launch Brave without sandboxes. Use with caution.',
  ],
  [
    `$0 --ignore-default-brave-arg='--disable-extensions'`,
    'Disable the default arguments provided by Puppeteer. Use with caution.',
  ],
  ['$0 --no-category-emulation', 'Disable tools in the emulation category'],
  [
    '$0 --no-category-performance',
    'Disable tools in the performance category',
  ],
  ['$0 --no-category-network', 'Disable tools in the network category'],
  [
    '$0 --user-data-dir=/tmp/user-data-dir',
    'Use a custom user data directory',
  ],
  [
    '$0 --auto-connect',
    'Connect to a running Brave instance instead of launching a new one',
  ],
  [
    '$0 --slim',
    'Only 3 tools: navigation, JavaScript execution and screenshot',
  ],
])
```

- [ ] **Step 5: Remove telemetry CLI options**

Remove these options from `cliOptions`:
- `usageStatistics`
- `clearcutEndpoint`
- `clearcutForceFlushIntervalMs`
- `clearcutIncludePidHeader`
- `performanceCrux` (keep this one — CrUX is a Google web API that works independently of the browser)

Actually, keep `performanceCrux` since it's useful for any Chromium browser.

- [ ] **Step 6: Commit**

```bash
git add src/bin/brave-devtools-mcp-cli-options.ts
git commit -m "refactor: update CLI options for Brave, remove channel and telemetry options"
```

---

### Task 5: Update index.ts (MCP server setup)

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Update MCP server identity**

```typescript
const server = new McpServer(
  {
    name: 'brave_devtools',
    title: 'Brave DevTools MCP server',
    version: VERSION,
  },
  {capabilities: {logging: {}}},
);
```

- [ ] **Step 2: Remove Clearcut telemetry**

Remove:
- `ClearcutLogger` import
- `clearcutLogger` variable and all references
- `bucketizeLatency` import
- The `clearcutLogger` setup block at the top of `createMcpServer`
- `server.server.oninitialized` handler (only used for clearcut)
- `clearcutLogger?.logToolInvocation(...)` in the finally block
- Return only `{server}` instead of `{server, clearcutLogger}`

- [ ] **Step 3: Update `getContext` to remove channel**

In the `getContext` function:
- Rename `chromeArgs` to `braveArgs` and reference `serverArgs.braveArg`
- Rename `ignoreDefaultChromeArgs` to `ignoreDefaultBraveArgs` and reference `serverArgs.ignoreDefaultBraveArg`
- Remove `channel` from `ensureBrowserConnected` call
- Remove `channel` from `ensureBrowserLaunched` call
- Update `ensureBrowserLaunched` to pass `braveArgs` and `ignoreDefaultBraveArgs`

- [ ] **Step 4: Update `logDisclaimers`**

```typescript
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
```

Remove the usage statistics disclaimer block entirely.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: rebrand MCP server to brave_devtools, remove telemetry"
```

---

### Task 6: Update daemon utils and check-for-updates

**Files:**
- Modify: `src/daemon/utils.ts`
- Modify: `src/utils/check-for-updates.ts`
- Modify: `src/bin/check-latest-version.ts`
- Modify: `src/utils/files.ts`

- [ ] **Step 1: Update daemon utils**

In `src/daemon/utils.ts`:
```typescript
const APP_NAME = 'brave-devtools-mcp';
export const DAEMON_CLIENT_NAME = 'brave-devtools-cli-daemon';
```

- [ ] **Step 2: Update check-for-updates.ts**

Change environment variable:
```typescript
if (isChecking || process.env['BRAVE_DEVTOOLS_MCP_NO_UPDATE_CHECKS']) {
```

Change cache path:
```typescript
const cachePath = path.join(
  os.homedir(),
  '.cache',
  'brave-devtools-mcp',
  'latest.json',
);
```

- [ ] **Step 3: Update check-latest-version.ts**

Change the npm registry URL:
```typescript
const response = await fetch(
  'https://registry.npmjs.org/brave-devtools-mcp/latest',
);
```

- [ ] **Step 4: Update files.ts**

Change temp directory prefix:
```typescript
const dir = await fs.mkdtemp(
  path.join(os.tmpdir(), 'brave-devtools-mcp-'),
);
```

- [ ] **Step 5: Commit**

```bash
git add src/daemon/utils.ts src/utils/check-for-updates.ts src/bin/check-latest-version.ts src/utils/files.ts
git commit -m "refactor: update daemon, cache, and temp paths to brave-devtools-mcp"
```

---

### Task 7: Update telemetry persistence and types (or remove)

**Files:**
- Modify: `src/telemetry/persistence.ts`
- Modify: `src/telemetry/types.ts`
- Modify: `src/telemetry/flagUtils.ts`

- [ ] **Step 1: Update persistence.ts**

Change the data folder name:
```typescript
const name = 'brave-devtools-mcp';
```

- [ ] **Step 2: Update types.ts**

Rename `ChromeDevToolsMcpExtension` to `BraveDevToolsMcpExtension`. Remove `ChromeChannel` enum (no longer needed). Update any references.

- [ ] **Step 3: Update flagUtils.ts**

Update import to reference `brave-devtools-mcp-cli-options.js`.

Remove the `channel` flag from usage computation since it no longer exists.

- [ ] **Step 4: Update ClearcutLogger.ts and other telemetry files**

Since we're removing telemetry from `index.ts`, the ClearcutLogger won't be instantiated. However, to keep the codebase clean, either:
- Remove `src/telemetry/ClearcutLogger.ts` and `src/telemetry/watchdog/` entirely
- Or keep them but update the chrome references

Recommended: remove `ClearcutLogger.ts`, `WatchdogClient.ts`, and the `watchdog/` directory. Keep `persistence.ts`, `types.ts`, `flagUtils.ts`, `metricUtils.ts` only if they're used elsewhere.

Check if `metricUtils.ts` is used outside of ClearcutLogger. If not, remove it too.

- [ ] **Step 5: Commit**

```bash
git add src/telemetry/
git commit -m "refactor: remove Clearcut telemetry, update remaining telemetry references"
```

---

### Task 8: Update remaining Chrome references in MCP server code

**Files:**
- Modify: `src/bin/brave-devtools-mcp-main.ts` (env var)
- Modify: `src/McpContext.ts`
- Modify: `src/tools/extensions.ts`
- Modify: `src/tools/performance.ts`
- Modify: `src/tools/screencast.ts`
- Modify: `src/tools/tools.ts`

- [ ] **Step 1: Update environment variable in main**

In `src/bin/brave-devtools-mcp-main.ts`:
```typescript
if (
  process.env['CI'] ||
  process.env['BRAVE_DEVTOOLS_MCP_NO_USAGE_STATISTICS']
) {
```

Actually, since we're removing telemetry entirely, remove this block. Also remove the `usageStatistics` assignment. Remove `clearcutLogger` references. The main file should simplify to just creating the server and connecting transport.

- [ ] **Step 2: Update McpContext.ts**

Search for any "chrome" or "Chrome" strings and update them to Brave equivalents.

- [ ] **Step 3: Update tools files**

In `src/tools/extensions.ts`, `src/tools/performance.ts`, `src/tools/screencast.ts`, `src/tools/tools.ts`:
- Search for "chrome" references and update to "brave" where they are user-facing strings
- Keep technical references that are part of the DevTools Protocol (e.g., `chrome-devtools-frontend` package references may need to stay since that's the actual package name)

- [ ] **Step 4: Grep for any remaining "chrome-devtools-mcp" references**

```bash
grep -r "chrome-devtools-mcp" src/ --include="*.ts" -l
```

Fix any remaining references.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: update remaining Chrome references to Brave across codebase"
```

---

### Task 9: Update rollup config and build

**Files:**
- Modify: `rollup.config.mjs`

- [ ] **Step 1: Update entry points in rollup config**

Update any references to `chrome-devtools-mcp.js` or `chrome-devtools.js` entry points to their `brave-` equivalents.

- [ ] **Step 2: Verify build works**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit if changes were needed**

```bash
git add rollup.config.mjs
git commit -m "chore: update rollup entry points for brave-devtools-mcp"
```

---

### Task 10: Update README and documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Replace all Chrome references with Brave throughout the README:
- Title, description, installation instructions
- `npx chrome-devtools-mcp` -> `npx brave-devtools-mcp`
- `chrome-devtools` CLI references -> `brave-devtools`
- GitHub URLs to point to `neolivz/brave-devtools-mcp`
- `chrome://inspect` -> `brave://inspect`
- Remove usage statistics section (or note that telemetry has been removed)

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for brave-devtools-mcp"
```

---

### Task 11: Verify and test

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 2: Grep for remaining Chrome references**

```bash
grep -ri "chrome-devtools-mcp" src/ --include="*.ts"
grep -ri "chrome-devtools" src/ --include="*.ts" | grep -v "chrome-devtools-frontend" | grep -v "third_party"
```

Expected: No results (excluding third_party references to `chrome-devtools-frontend` package which is a dependency name).

- [ ] **Step 3: Run existing tests**

```bash
npm test
```

Fix any test failures due to renamed strings/files.

- [ ] **Step 4: Manual test — launch Brave**

```bash
node build/src/bin/brave-devtools-mcp.js
```

Expected: Brave launches (or meaningful "Brave not found" error if not installed).

- [ ] **Step 5: Push to fork**

```bash
git push origin main
```
