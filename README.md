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

- When the world loads and is paused, the module clears the pause the moment
  the first **GM-level user** (GM or Assistant GM) finishes loading.
- The unpaused state persists — after the GM logs off, the world stays open
  for players.
- That's it. One `ready` hook, ~20 lines, no configuration, no UI.

## Good to know

- **A GM-level login is what clears the pause.** Foundry only lets GM-level
  users change the pause state — a player client has no permission to do it.
  If the world boots and *only* players connect (no GM has loaded in since
  boot), core Foundry provides no way around that. In practice: the first
  time you (or any assistant GM) touch the world after it starts, it opens,
  and it stays open.
- **Pausing mid-session still works.** The module only acts when a client
  finishes loading (the `ready` hook). Press space during a session and the
  game pauses like normal — just know that if a GM then reloads their
  browser, the world unpauses again.
- **Compatibility:** Foundry v11 through v14 (it handles the
  `togglePause` API change in v12 automatically).

## License

[MIT](LICENSE)
