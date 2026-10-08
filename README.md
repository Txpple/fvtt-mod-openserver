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

The Open Roll 5e dnd5e MCP server sets the same flag through its `set-landing-scene` tool, so a
landing scene can also be assigned from Claude Code.

## Good to know

- **The module only acts when a client finishes loading.** Pausing mid-session works as normal, but
  if a GM then reloads their browser, the world unpauses again.
- **The server reports the world as paused until a GM connects.** A player's local lift does not
  change the stored state; the first GM login clears it for real.

## Development

There is no build step: the module is one plain ES module, `scripts/openserver.js`, loaded
straight from the repo. Releases: bump `version` and the `download` URL in `module.json` together,
tag `vX.Y.Z`, and publish a zip of the module with the manifest as a GitHub release.

<!-- openroll5e:family -->
## Part of Open Roll 5e

Open Server is one of the Open Roll 5e modules for Foundry VTT, a suite built for one D&D 5e table and
shared. Each module installs and works on its own and none needs another; together they cover the
table from the fog of war to the loot. The other modules:

- [Open Roll 5e: Autoexplore](https://github.com/Txpple/fvtt-mod-autoexplore): lets a scene start fully explored, so the whole map shows through the fog of war while tokens still need line of sight.
- [Open Roll 5e: Battle Flow](https://github.com/Txpple/fvtt-mod-battleflow): combat automation for dnd5e 2024 rules: a hit rolls and applies its own damage, saves resolve themselves, reactions hold, and concentration is tracked. Every rule that touches a fight in the 2024 core books, Heroes of Faerûn, Arcana Unleashed and Ravenloft: The Horrors Within.
- [Open Roll 5e: Combat Plus](https://github.com/Txpple/fvtt-mod-combatplus): automates the chores of running a fight: combat music, an initiative gate, an out-of-turn movement block, defeated marking at 0 HP and turn alerts.
- [Open Roll 5e: Errata](https://github.com/Txpple/fvtt-mod-errata5e): corrects, in memory, bugs in the premium D&D 2024 books, the dnd5e system and Foundry itself, each fix held until the vendor ships its own.
- [Open Roll 5e: FX Studio](https://github.com/Txpple/fvtt-mod-fxstudio): visual and sound effects for dnd5e, played from what actually happened at the table, with about a thousand stock FX and a window for authoring your own.
- [Open Roll 5e: Loot Shelf](https://github.com/Txpple/fvtt-mod-lootshelf): loot chests and merchant shelves that players can take from, buy from and sell to without owning them, with a receipt for every trade.
- [Open Roll 5e: Party Stash](https://github.com/Txpple/fvtt-mod-partystash): makes a dnd5e Group actor's inventory a working party stash: drags move instead of copying, coin moves through a dialog, and every transfer posts a receipt.
- [Open Roll 5e: Soundscape](https://github.com/Txpple/fvtt-mod-soundscape): background sound for scenes: random one-shots with silence between them, seamless crossfaded loops, day and night gating, and quiet during combat.

Three MCP servers for [Claude Code](https://claude.com/claude-code) complete the suite:

- [fvtt-mcp-dnd5e](https://github.com/Txpple/fvtt-mcp-dnd5e): builds D&D 5e content in a live Foundry world from Claude Code: a stat block becomes a complete NPC, a map image a walled and lit scene, an adventure its journals, tables and handouts.
- [fvtt-mcp-imagegen](https://github.com/Txpple/fvtt-mcp-imagegen): makes the art with Google's Gemini image models: icons, tokens, props, portraits and illustrations, token redresses and restyles, battlemap and overland-map repaints, and the illustrated session records, all grounded in what the world already shows.
- [fvtt-mcp-sessionscribe](https://github.com/Txpple/fvtt-mcp-sessionscribe): turns a session's Discord recording and Foundry chat log into its record. Its end-to-end `session-scribe` skill drives the server from the Craig link to a speaker-labelled transcript, a fully illustrated player recap, combat statistics, GM notes and a party snapshot.

Issues are welcome on every repo in the family; pull requests are not accepted, since each is one
author's design for one table, shared because it might suit yours. How they fit together is mapped in [fvtt-suite-openroll5e](https://github.com/Txpple/fvtt-suite-openroll5e).
<!-- /openroll5e:family -->

## License

MIT. See [LICENSE](LICENSE).
