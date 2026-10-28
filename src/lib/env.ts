/** Reads MIREN_<name>, falling back to the pre-rename GLOWCHECK_<name> so existing deployments keep working. */
export function mirenEnv(name: string): string | undefined {
  return process.env[`MIREN_${name}`] || process.env[`GLOWCHECK_${name}`] || undefined;
}
