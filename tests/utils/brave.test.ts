/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert';
import path from 'node:path';
import {describe, it} from 'node:test';

import {
  detectBraveExecutable,
  getBraveExecutableCandidates,
  getDefaultBraveUserDataDir,
} from '../../src/utils/brave.js';

describe('brave', () => {
  describe('detectBraveExecutable', () => {
    it('returns the macOS app bundle binary', () => {
      assert.strictEqual(
        detectBraveExecutable('darwin', {}, () => true),
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      );
    });

    it('returns the first existing Linux candidate', () => {
      assert.strictEqual(
        detectBraveExecutable(
          'linux',
          {},
          filePath => filePath === '/snap/bin/brave',
        ),
        '/snap/bin/brave',
      );
    });

    it('prefers the per-user install on Windows', () => {
      const env = {
        LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local',
        PROGRAMFILES: 'C:\\Program Files',
      };
      assert.deepStrictEqual(getBraveExecutableCandidates('win32', env), [
        'C:\\Users\\me\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      ]);
    });

    it('throws a helpful error when Brave is not installed', () => {
      assert.throws(
        () => detectBraveExecutable('linux', {}, () => false),
        /Brave Browser not found.*--executablePath/,
      );
    });
  });

  describe('getDefaultBraveUserDataDir', () => {
    it('uses Application Support on macOS', () => {
      assert.strictEqual(
        getDefaultBraveUserDataDir('darwin', {}, '/Users/me'),
        path.join(
          '/Users/me',
          'Library',
          'Application Support',
          'BraveSoftware',
          'Brave-Browser',
        ),
      );
    });

    it('uses LOCALAPPDATA on Windows', () => {
      assert.strictEqual(
        getDefaultBraveUserDataDir(
          'win32',
          {LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local'},
          'C:\\Users\\me',
        ),
        'C:\\Users\\me\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data',
      );
    });

    it('honors an absolute XDG_CONFIG_HOME on Linux', () => {
      assert.strictEqual(
        getDefaultBraveUserDataDir(
          'linux',
          {XDG_CONFIG_HOME: '/xdg'},
          '/home/me',
        ),
        path.join('/xdg', 'BraveSoftware', 'Brave-Browser'),
      );
    });

    it('ignores a relative XDG_CONFIG_HOME on Linux', () => {
      assert.strictEqual(
        getDefaultBraveUserDataDir(
          'linux',
          {XDG_CONFIG_HOME: 'relative'},
          '/home/me',
        ),
        path.join('/home/me', '.config', 'BraveSoftware', 'Brave-Browser'),
      );
    });
  });
});
