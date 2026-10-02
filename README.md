# Open Roll 5e: Open Server

A Foundry VTT module for hosted worlds. A world comes up paused, so on a hosted server players who
log in before the GM are stuck waiting for someone to press space. Open Server clears that pause at
login. It also gives each user an optional landing scene of their own, so a party split survives a
refresh or a fresh login. There are no settings.

## How it works

- **A GM login unpauses the world for everyone.** The clear is real and persistent, so the world
  stays open after the GM logs off. With several GMs connected, the active GM does it.
- **A player login with no GM online lifts the pause on that player's client only.** Players cannot
  change the server's pause state, but the checks that stop a paused player (token movement, doors)
  run on their own client, so a local lift is enough to play.
- **A pause with a GM online is respected.** The module assumes it is deliberate and leaves players
  paused.
- **A flagged user lands on their own scene.** Unflagged users follow the active scene as usual.

## Installation

Paste the manifest URL into Foundry's *Install Module* dialog:

```
https://github.com/Txpple/fvtt-mod-openserver/releases/latest/download/module.json
```

Requires Foundry VTT v11 through v14. It works with any game system and has no dependencies.

## Landing scene

Foundry has no per-user landing scene: every user lands on the active scene at every login. A GM can
send one player to a side scene, but a refresh puts them back with everyone else. To give a user a
scene of their own, set a flag on them from the console or a macro:

```js
game.users.getName("Tom").setFlag("fvtt-mod-openserver", "landingScene", scene.id);
```

Tom lands on that scene from then on. To put them back with the party:

```js
game.users.getName("Tom").unsetFlag("fvtt-mod-openserver", "landingScene");
```

- **No scene ownership is needed.** Viewing a scene has no permission check in Foundry.
- **The flag is sticky.** It stays until a GM clears it, so activating a new scene does not move
  flagged users.
- **Expect a brief flash.** The switch happens once the client has loaded, after the active scene is
  already drawn, the same as a cross-scene teleporter.
- **A deleted scene is safe.** If the flagged scene no longer exists, the user stays on the active
  scene and the console logs a warning naming the stale flag.

## Good to know

- **The module only acts when a client finishes loading.** Pausing mid-session works as normal, but
  if a GM then reloads their browser, the world unpauses again.
- **The server reports the world as paused until a GM connects.** A player's local lift does not
  change the stored state; the first GM login clears it for real.

## License

MIT. See [LICENSE](LICENSE).
