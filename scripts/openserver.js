/**
 * Open Server
 *
 * Leaves the world playable when it comes up, so players on a hosted server
 * (e.g. Molten Hosting's player start URL) can log in and do what they need
 * without waiting for the GM. No settings, no UI — install, enable, done.
 *
 * Two features, both driven off `ready` on each client:
 *
 *  1. AUTO-UNPAUSE — clear the pause a freshly-booted world comes up with.
 *  2. LANDING SCENE — send a flagged user to their OWN scene at login,
 *     instead of the one active scene everybody else lands on.
 *
 * ── 1. Auto-unpause ──────────────────────────────────────────────────────
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
 */
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

    console.log("fvtt-mod-openserver | World unpaused for everyone.");
    return;
  }

  // Player client. A connected GM's pause is deliberate — leave it alone.
  if (game.users.activeGM) return;

  // No GM online: lift the pause locally so this player can act.
  game.togglePause(false);
  console.log(
    "fvtt-mod-openserver | No GM online — pause lifted locally for this player."
  );
});

/**
 * ── 2. Landing scene ─────────────────────────────────────────────────────
 *
 * Core Foundry has NO per-user landing scene. `Game#initializeCanvas` asks for
 * `game.scenes.current`, and that getter falls back to `this.active` while the
 * canvas is still cold — so EVERY user, every login, lands on the one active
 * scene. There is no User schema field for it either (verified against v14.364:
 * the persisted User fields are _id/name/role/password/passwordSalt/avatar/
 * character/color/pronouns/hotbar/permissions/flags/_stats — `viewedScene` is an
 * ephemeral own-property fed by activity broadcast, not saved anywhere).
 *
 * So a party split can't survive a login: the GM can pull a player to a side
 * scene while they're connected, but the moment they refresh or log in again
 * they're back with everyone else.
 *
 * This closes that. A GM stamps a scene id on a user:
 *
 *     user.setFlag("fvtt-mod-openserver", "landingScene", scene.id)
 *
 * and from then on that user lands there instead. Unflagged users are left
 * completely alone and follow the active scene exactly as core intends, so the
 * module stays inert for anyone who never opts in. Clear it with
 * `user.unsetFlag(...)` to put them back with the party.
 *
 * Why this is allowed to work at all: `Scene#view()` carries no permission gate
 * (probed live on 14.364), which is why players already walk between scenes they
 * don't own via teleporters. The flag needs no scene ownership.
 *
 * Runs at `ready`, i.e. AFTER core has drawn the active scene — so there is a
 * brief flash of the active scene before the swap. That's the same thing a
 * cross-scene teleporter does, and it's the price of not fighting core's own
 * canvas bootstrap.
 */
Hooks.once("ready", () => {
  const sceneId = game.user.getFlag("fvtt-mod-openserver", "landingScene");
  if (!sceneId) return; // Not opted in — follow the active scene, as core does.

  // Nothing to route to when the canvas is switched off entirely.
  if (game.settings.get("core", "noCanvas")) return;

  const scene = game.scenes.get(sceneId);
  if (!scene) {
    // The scene was deleted out from under the flag. Staying put beats a black
    // canvas, and the stale flag is named so a GM can clear it.
    console.warn(
      `fvtt-mod-openserver | Landing scene "${sceneId}" no longer exists — ` +
        `staying on the active scene. Clear the stale landingScene flag on user "${game.user.name}".`
    );
    return;
  }

  // Already looking at it (the usual case: it IS the active scene). Don't force
  // a second full canvas draw for nothing.
  if (scene.isView) return;

  Promise.resolve(scene.view()).catch((err) => {
    console.error(
      `fvtt-mod-openserver | Failed to view landing scene "${scene.name}":`,
      err
    );
  });
  console.log(
    `fvtt-mod-openserver | Landing scene for "${game.user.name}": "${scene.name}".`
  );
});
