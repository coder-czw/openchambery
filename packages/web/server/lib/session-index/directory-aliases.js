import fs from 'node:fs';

/**
 * Directory alias canonicalization.
 *
 * OpenCode records a session under whatever directory string the launching
 * client used, so the same physical project can appear under several spellings
 * — most commonly through a symlinked ancestor (`~/work -> /Volumes/ORICO/work`).
 * Every directory-keyed store in OpenChamber (session index, sidebar filters,
 * per-directory sync) compares those strings exactly, which silently hides
 * alias-spelled sessions from projects they belong to.
 *
 * Canonicalization resolves a directory through the local filesystem so all
 * spellings of one physical directory collapse onto the realpath form. It is
 * strictly best-effort: paths that do not exist locally (remote runtimes,
 * unmounted drives) keep their normalized spelling, and failures never throw.
 */

const normalizeSpelling = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized || null;
};

export const createDirectoryAliasResolver = ({
  existsSync = fs.existsSync,
  realpathSync = fs.realpathSync,
} = {}) => {
  const cache = new Map();

  const canonicalizeDirectory = (value) => {
    const normalized = normalizeSpelling(value);
    if (!normalized) return null;
    if (cache.has(normalized)) return cache.get(normalized);
    let canonical = normalized;
    try {
      if (existsSync(normalized)) {
        const real = normalizeSpelling(realpathSync(normalized));
        if (real) canonical = real;
      }
    } catch {
      // Unreadable path — keep the normalized spelling.
    }
    cache.set(normalized, canonical);
    return canonical;
  };

  return { canonicalizeDirectory };
};

const defaultResolver = createDirectoryAliasResolver();

/** Canonicalize a directory string through the local filesystem (best-effort). */
export const canonicalizeDirectory = defaultResolver.canonicalizeDirectory;
