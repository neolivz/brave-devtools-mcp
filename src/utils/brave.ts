/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function getBraveExecutableCandidates(
  platform: NodeJS.Platform = os.platform(),
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (platform === 'darwin') {
    return ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'];
  }
  if (platform === 'win32') {
    return [env['LOCALAPPDATA'], env['PROGRAMFILES'], env['PROGRAMFILES(X86)']]
      .filter((dir): dir is string => !!dir)
      .map(dir =>
        path.win32.join(
          dir,
          'BraveSoftware',
          'Brave-Browser',
          'Application',
          'brave.exe',
        ),
      );
  }
  return [
    '/usr/bin/brave-browser',
    '/usr/bin/brave',
    '/opt/brave.com/brave/brave',
    '/snap/bin/brave',
  ];
}

export function detectBraveExecutable(
  platform: NodeJS.Platform = os.platform(),
  env: NodeJS.ProcessEnv = process.env,
  exists: (filePath: string) => boolean = fs.existsSync,
): string {
  const candidate = getBraveExecutableCandidates(platform, env).find(exists);
  if (!candidate) {
    throw new Error(
      'Brave Browser not found. Install Brave or provide the path with --executablePath.',
    );
  }
  return candidate;
}

/**
 * The user data directory of the user's default Brave profile, used by
 * --autoConnect to find the DevToolsActivePort file.
 */
export function getDefaultBraveUserDataDir(
  platform: NodeJS.Platform = os.platform(),
  env: NodeJS.ProcessEnv = process.env,
  homedir: string = os.homedir(),
): string {
  if (platform === 'darwin') {
    return path.join(
      homedir,
      'Library',
      'Application Support',
      'BraveSoftware',
      'Brave-Browser',
    );
  }
  if (platform === 'win32') {
    const localAppData =
      env['LOCALAPPDATA'] ?? path.win32.join(homedir, 'AppData', 'Local');
    return path.win32.join(
      localAppData,
      'BraveSoftware',
      'Brave-Browser',
      'User Data',
    );
  }
  const configHome =
    env['XDG_CONFIG_HOME'] && path.isAbsolute(env['XDG_CONFIG_HOME'])
      ? env['XDG_CONFIG_HOME']
      : path.join(homedir, '.config');
  return path.join(configHome, 'BraveSoftware', 'Brave-Browser');
}
