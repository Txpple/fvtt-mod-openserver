/**
 * Open Server
 *
 * Leaves the world playable when it comes up, so players on a hosted server
 * (e.g. Molten Hosting's player start URL) can log in and do what they need
 * without waiting for the GM. No settings — install, enable, done.
 *
 * This file is the AUTO-UNPAUSE, driven off `ready` on each client; the other
 * feature, "Jump to my character", is scripts/jump.js.
 *
 * Two cases, handled on each client as it finishes loading:
 *
 *  - GM-level user: clear the REAL (server) pause for everyone. Only a GM
 *    has permission to do this, and it persists.
 *
 *  - Player, world paused, NO GM online: lift the pause LOCALLY. Players can
 *    never change the server's pause state (core permission), but the checks
 *    that block a paused player — token movement, doors — run client-side
 *    against this client's own pause flag, so a local lift opens them up.
 *    If a GM *is* online while the world is paused, that pause is presumed
 *    deliberate and is respected.
 *
 * Open Server 1.x also carried a per-user landing scene (a `landingScene`
 * flag on the user, read at login). It went with the jump: a player who needs
 * their character reaches it in one click, so a sticky seat is no longer worth
 * its edge cases. A stale flag on a user is inert; nothing reads it.
 */
// The module's one voice in the console: the family's convention allows warn and error alone,
// and these are notices, so they are the one place Biome looks away.
// biome-ignore lint/suspicious/noConsole: the module's notices
const say = (...args) => console.log(...args);

Hooks.once("ready", () => {
  if (!game.paused) return;

  if (game.user.isGM) {
    // If several GMs are connected, let the designated active GM do it
    // (game.paused is re-checked anyway, so this is just tidiness).
    if (game.users.activeGM && game.users.activeGM !== game.user) return;

    // v12+ takes an options object; v11 takes a boolean `push`.
    const gen = game.release?.generation ?? 0;
    if (gen >= 12) game.togglePause(false, { broadcast: true });
    else game.togglePause(false, true);

    say("fvtt-mod-openserver | World unpaused for everyone.");
    return;
  }

  // Player client. A connected GM's pause is deliberate — leave it alone.
  if (game.users.activeGM) return;

  // No GM online: lift the pause locally so this player can act.
  game.togglePause(false);
  say(
    "fvtt-mod-openserver | No GM online — pause lifted locally for this player."
  );
});
