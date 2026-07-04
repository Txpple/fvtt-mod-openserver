/**
 * Open Server (Auto-Unpause)
 *
 * Leaves the world in an unpaused state when it comes up, so players on a
 * hosted server (e.g. Molten Hosting) can log in and do what they need
 * without waiting for the GM to press space.
 *
 * How it works: only a GM-level user has permission to broadcast a pause
 * change, so the first GM (or Assistant GM) client to finish loading clears
 * the pause. No settings, no UI — install, enable, done.
 */
Hooks.once("ready", () => {
  if (!game.paused) return;

  // Players lack permission to broadcast an unpause — GM-level users only.
  if (!game.user.isGM) return;

  // If several GMs are connected, let the designated active GM do it
  // (game.paused is re-checked anyway, so this is just tidiness).
  if (game.users.activeGM && game.users.activeGM !== game.user) return;

  // v12+ takes an options object; v11 takes a boolean `push`.
  const gen = game.release?.generation ?? 0;
  if (gen >= 12) game.togglePause(false, { broadcast: true });
  else game.togglePause(false, true);

  console.log("fvtt-mod-openserver | World unpaused — open for players.");
});
