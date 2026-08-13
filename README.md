# Open Server

A tiny, **configuration-free** Foundry VTT module for hosted worlds. It does two
things, both at login:

1. **Auto-unpause** — leaves the server **unpaused** when the world comes up, so
   players on a hosted server (e.g. [Molten Hosting](https://moltenhosting.com))
   can log in and do whatever they need without waiting for the GM to press space.
2. **Landing scene** — sends a flagged user to **their own scene** at login,
   instead of the one active scene everybody else lands on.

Install it, enable it, forget it. There are no settings.

## Install

In Foundry: **Setup → Add-on Modules → Install Module**, then paste this
manifest URL:

```
https://github.com/Txpple/fvtt-mod-openserver/releases/latest/download/module.json
```

Then enable **Open Server** in your world's **Manage Modules** list.

## Auto-unpause

Two cases, handled automatically as each client finishes loading:

- **A GM (or Assistant GM) logs in** → the module clears the real pause for
  everyone, persistently. After the GM logs off, the world stays open.
- **A player logs in, the world is paused, and no GM is online** (the hosted
  "player start URL" case) → the module lifts the pause **locally on that
  player's client**, so they can move their tokens, open doors, and play.
  Players can never change the *server's* pause state — that's a core Foundry
  permission — but the checks that block a paused player run client-side, so
  a local lift is all they need.

A deliberate pause is respected — see *Good to know* below.

## Landing scene

Core Foundry has **no per-user landing scene**. Every user, every login, lands on
the one **active** scene: `Game#initializeCanvas` asks for `game.scenes.current`,
and that getter falls back to the active scene while the canvas is still cold.
There's no User field for it either — `viewedScene` exists at runtime but is never
saved.

That means a **party split can't survive a login**. A GM can pull one player off
to a side scene while they're connected, but the moment that player refreshes or
logs back in, they're dumped back with everyone else.

This module fixes that. Stamp a scene id on a user:

```js
game.users.getName("Tom").setFlag("fvtt-mod-openserver", "landingScene", scene.id);
```

…and Tom lands on that scene from then on. To put him back with the party:

```js
game.users.getName("Tom").unsetFlag("fvtt-mod-openserver", "landingScene");
```

Notes:

- **Unflagged users are untouched.** They follow the active scene exactly as core
  intends. The feature is inert for anyone who never opts in.
- **No scene ownership needed.** `Scene#view()` has no permission gate — which is
  why players already move between scenes they don't own via teleporters.
- **It's sticky.** The flag persists until a GM clears it. If you activate a new
  scene mid-campaign, flagged users still land on *their* scene, not the new
  active one. That's the point, but it's worth remembering when someone reports
  "I keep ending up in the wrong place."
- **Expect a brief flash.** The swap happens at `ready`, after core has already
  drawn the active scene. Same as a cross-scene teleporter.
- **A deleted scene is survivable.** If the flagged scene is gone, the module logs
  a warning naming the user and leaves them on the active scene.

That's it. `ready` hooks, no configuration, no UI.

## Good to know

- **A deliberate pause is respected.** If a GM is online and the world is
  paused, the module assumes that's on purpose and leaves players paused.
  The no-GM local lift only happens at login, into a world nobody is running.
- **Pausing mid-session still works.** The module only acts when a client
  finishes loading (the `ready` hook). Press space during a session and the
  game pauses like normal for everyone — just know that if a GM then reloads
  their browser, the world unpauses again.
- **The server still reports "paused" until a GM connects.** A player's local
  lift doesn't change the stored state (it can't); the first GM login squares
  it for real. Harmless either way.
- **Compatibility:** Foundry v11 through v14 (it handles the
  `togglePause` API change in v12 automatically).

## License

[MIT](LICENSE)
