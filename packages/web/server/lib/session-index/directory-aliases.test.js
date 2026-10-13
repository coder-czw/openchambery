import { describe, expect, it } from 'vitest';

import { createDirectoryAliasResolver } from './directory-aliases.js';

describe('directory alias resolver', () => {
  it('collapses symlinked spellings onto the realpath form', () => {
    const realpaths = new Map([
      ['/home/dev/work', '/Volumes/ORICO/work'],
      ['/home/dev/work/repo', '/Volumes/ORICO/work/repo'],
    ]);
    const { canonicalizeDirectory } = createDirectoryAliasResolver({
      existsSync: (value) => realpaths.has(value),
      realpathSync: (value) => realpaths.get(value),
    });

    expect(canonicalizeDirectory('/home/dev/work/repo/')).toBe('/Volumes/ORICO/work/repo');
    expect(canonicalizeDirectory('/Volumes/ORICO/work/repo')).toBe('/Volumes/ORICO/work/repo');
    expect(canonicalizeDirectory('/home/dev/work/repo')).toBe('/Volumes/ORICO/work/repo');
  });

  it('keeps the normalized spelling for paths missing from the local filesystem', () => {
    const { canonicalizeDirectory } = createDirectoryAliasResolver({
      existsSync: () => false,
      realpathSync: () => {
        throw new Error('must not be called');
      },
    });

    expect(canonicalizeDirectory('/remote/host/repo/')).toBe('/remote/host/repo');
    expect(canonicalizeDirectory('  ')).toBeNull();
    expect(canonicalizeDirectory(null)).toBeNull();
    expect(canonicalizeDirectory(42)).toBeNull();
  });

  it('swallows realpath failures and normalizes separators', () => {
    const { canonicalizeDirectory } = createDirectoryAliasResolver({
      existsSync: () => true,
      realpathSync: () => {
        throw new Error('EACCES');
      },
    });

    expect(canonicalizeDirectory('\\repo\\nested\\')).toBe('/repo/nested');
  });

  it('caches resolutions per spelling', () => {
    let calls = 0;
    const { canonicalizeDirectory } = createDirectoryAliasResolver({
      existsSync: () => true,
      realpathSync: (value) => {
        calls += 1;
        return `${value}/.real`;
      },
    });

    expect(canonicalizeDirectory('/repo')).toBe('/repo/.real');
    expect(canonicalizeDirectory('/repo')).toBe('/repo/.real');
    expect(calls).toBe(1);
  });
});
