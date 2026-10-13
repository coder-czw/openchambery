import { runtimeFetch } from "../runtime-fetch";

/**
 * Directory alias registry (renderer side).
 *
 * OpenCode stores each session under the raw directory string of the client
 * that created it, so one physical project can appear under several spellings
 * (typically a symlinked ancestor such as `~/work -> /Volumes/ORICO/work`).
 * The web server canonicalizes those spellings through the local filesystem
 * and exposes the alias → canonical map it discovers; live SDK / SSE sessions
 * are normalized through this registry so directory-keyed grouping, dedupe and
 * sidebar project matching all agree on one spelling per directory.
 */

type DirectoryAliasMap = Record<string, string>;

let directoryAliases: DirectoryAliasMap = {};

export const setDirectoryAliasMap = (map: DirectoryAliasMap | null | undefined): void => {
  directoryAliases = map && typeof map === "object" ? map : {};
};

export const getDirectoryAliasMap = (): DirectoryAliasMap => directoryAliases;

export const resolveAliasedDirectory = (value: string | null | undefined): string | null => {
  if (typeof value !== "string" || !value) return null;
  return directoryAliases[value] ?? value;
};

const serializeAliasMap = (map: DirectoryAliasMap): string => {
  const keys = Object.keys(map).sort();
  return keys.map((key) => `${key}\n${map[key]}`).join("\u0000");
};

let lastLoadedAliasMap = serializeAliasMap({});

/**
 * Fetch the alias map from the server. Returns true when the map changed since
 * the previous load, so callers can rebuild directory-keyed caches.
 */
export const loadDirectoryAliases = async (): Promise<boolean> => {
  const response = await runtimeFetch("/api/openchamber/directory-aliases");
  if (!response.ok) {
    throw new Error(`directory alias request failed (${response.status})`);
  }
  const payload = await response.json() as { available?: boolean; aliases?: DirectoryAliasMap };
  const aliases = payload.available === true
    && payload.aliases && typeof payload.aliases === "object"
    ? payload.aliases
    : {};
  setDirectoryAliasMap(aliases);
  const serialized = serializeAliasMap(aliases);
  if (serialized === lastLoadedAliasMap) return false;
  lastLoadedAliasMap = serialized;
  return true;
};
