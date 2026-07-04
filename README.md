# Open Server (Auto-Unpause)

A tiny, **configuration-free** Foundry VTT module that leaves the server in an
**unpaused** state when the world comes up — so players on a hosted server
(e.g. [Molten Hosting](https://moltenhosting.com)) can log in and do whatever
they need without waiting for the GM to press space.

Install it, enable it, forget it. There are no settings.

## Install

In Foundry: **Setup → Add-on Modules → Install Module**, then paste this
manifest URL:

```
https://github.com/Txpple/fvtt-mod-openserver/releases/latest/download/module.json
```

Then enable **Open Server (Auto-Unpause)** in your world's
**Manage Modules** list.

## What it does

Two cases, handled automatically as each client finishes loading:

- **A GM (or Assistant GM) logs in** → the module clears the real pause for
  everyone, persistently. After the GM logs off, the world stays open.
- **A player logs in, the world is paused, and no GM is online** (the hosted
  "player start URL" case) → the module lifts the pause **locally on that
  player's client**, so they can move their tokens, open doors, and play.
  Players can never change the *server's* pause state — that's a core Foundry
  permission — but the checks that block a paused player run client-side, so
  a local lift is all they need.

That's it. One `ready` hook, no configuration, no UI.

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
