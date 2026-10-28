# Open Roll 5e: Open Server

A Foundry VTT module for hosted worlds. A world comes up paused, so on a hosted server players who
log in before the GM are stuck waiting for someone to press space. Open Server clears that pause at
login. It also puts a button beside each name in the Players list that jumps to that player's
character wherever its token stands, so nobody is ever lost on the wrong map. There are no settings.

## How it works

- **A GM login unpauses the world for everyone.** The clear is real and persistent, so the world
  stays open after the GM logs off. With several GMs connected, the active GM does it.
- **A player login with no GM online lifts the pause on that player's client only.** Players cannot
  change the server's pause state, but the checks that stop a paused player (token movement, doors)
  run on their own client, so a local lift is enough to play.
- **A pause with a GM online is respected.** The module assumes it is deliberate and leaves players
  paused.
- **Anyone can jump to their character.** One click in the Players list views the scene the token
  is on, selects it and pans to it; a GM has the same button for every player.

## Installation

Paste the manifest URL into Foundry's *Install Module* dialog:

```
https://github.com/Txpple/fvtt-mod-openserver/releases/latest/download/module.json
```

Requires Foundry VTT v11 through v14. It works with any game system and has no dependencies.

## Jump to my character

A player who walked a familiar onto another map, or was left on a side scene after a teleport went
wrong, had no way back to their own character short of asking the GM. Now a crosshair sits beside
their name in the Players list (bottom left). Hover it and it reads "Jump to <character>"; click it
and the view goes to the character's token, selects it, releasing anything else selected, and pans
to it. All of it happens on the clicking user's own client; nothing is written and no GM is needed.

Which token:

- **The active scene wins.** If the character has a token on the active scene, that is the one,
  even when a copy stands somewhere else.
- **Then the scene you are looking at.** On a side map with your own token in front of you, the
  jump selects it there; no question.
- **One scene jumps.** If neither has one and exactly one other scene does, the jump goes there
  without asking.
- **Several scenes ask.** A small dialog lists the scenes that have one as a pick list, the
  navigation bar's first in bar order, then the rest by name, the first chosen; Jump (or Enter)
  goes, Cancel stays. A second click on the crosshair replaces the list rather than stacking one.
- **None says so.** With no token anywhere, the view goes to the active scene and a notice reads
  "<character> has no token on any scene".
- **A player with the table stays.** On the active scene with the token elsewhere, a player is not
  taken off it; a notice says the token is on another scene. A GM jumps from anywhere to anywhere.

A player sees the button on their own row, when they have an assigned character. A GM sees one on
every row whose user has one, their own included, and the jump works the same from there: a quick
way to find any player's character. A user with no assigned character has no button. Viewing a
scene has no permission check in Foundry, so no scene ownership is needed; selecting the token needs
what the player already has, control of their own character.

Open Server 1.x also offered a per-user landing scene, a flag a GM set so a user landed on a scene
of their own at every login. It is gone from 1.4: with the jump one click away, a sticky seat was
not worth its edge cases. A flag left on a user does nothing.

## Good to know

- **The module only acts when a client finishes loading.** Pausing mid-session works as normal, but
  if a GM then reloads their browser, the world unpauses again.
- **The server reports the world as paused until a GM connects.** A player's local lift does not
  change the stored state; the first GM login clears it for real.

## Development

There is no build step: the module is plain ES modules loaded straight from `scripts/`. Run
`npm install` once; `npm run verify` is the gate: Biome and the unit tests in `tests/`. Every word a
player reads is in `lang/en.json`.

Releases: bump `version` and the `download` URL in `module.json` together and commit, then
push an annotated tag `vX.Y.Z` on `main` whose subject is the release title and whose body is the
notes. `.github/workflows/release.yml` hands it to the family's reusable release workflow (in
fvtt-suite-openroll5e), which checks the tag, builds the zip of `module.json` and the served
folders, reads it back, and publishes it with a bare `module.json`. Run the workflow by hand for a
dry run: the same checks and build, the zip kept as an artifact.

<!-- openroll5e:family -->
## Part of Open Roll 5e

Open Server is one of the Open Roll 5e modules for Foundry VTT, a suite built for one D&D 5e table and
shared. Each module installs and works on its own and none needs another; together they cover the
table from the fog of war to the loot. The other modules:

- [Open Roll 5e: Autoexplore](https://github.com/Txpple/fvtt-mod-autoexplore): lets a scene start fully explored, so the whole map shows through the fog of war while tokens still need line of sight.
- [Open Roll 5e: By the Books](https://github.com/Txpple/fvtt-mod-bythebooks): the 2024 rules played from the sheet: a hit rolls and applies its own damage, saves resolve themselves, reactions hold, concentration is tracked, and rests, senses, sizes and lights follow the book. Every rule that rides a use or an effect in the 2024 core books, Heroes of Faerûn, Arcana Unleashed and Ravenloft: The Horrors Within, each step with a receipt and a revert; offered, never enforced.
- [Open Roll 5e: Combat Plus](https://github.com/Txpple/fvtt-mod-combatplus): automates the chores of running a fight: combat music, an initiative gate, an out-of-turn movement block, defeated marking at 0 HP and turn alerts.
- [Open Roll 5e: Errata](https://github.com/Txpple/fvtt-mod-errata5e): corrects, in memory, bugs in the premium D&D 2024 books, the dnd5e system and Foundry itself, each fix held until the vendor ships its own.
- [Open Roll 5e: FX Studio](https://github.com/Txpple/fvtt-mod-fxstudio): visual and sound effects for dnd5e, played from what actually happened at the table, with about a thousand stock FX and a window for authoring your own.
- [Open Roll 5e: Loot Shelf](https://github.com/Txpple/fvtt-mod-lootshelf): loot chests and merchant shelves that players can take from, buy from and sell to without owning them, with a receipt for every trade.
- [Open Roll 5e: Party Stash](https://github.com/Txpple/fvtt-mod-partystash): makes a dnd5e Group actor's inventory a working party stash: drags move instead of copying, coin moves through a dialog, and every transfer posts a receipt.
- [Open Roll 5e: Area Sounds](https://github.com/Txpple/fvtt-mod-areasounds): background sound for scenes: random one-shots with silence between them, seamless crossfaded loops, day and night gating, and quiet during combat.
- [Open Roll 5e: Token Art](https://github.com/Txpple/fvtt-mod-tokenart): gives every token the look of its state, ready, in combat or dead, each a file named beside the base art, with nothing to configure.

Three MCP servers for [Claude Code](https://claude.com/claude-code) complete the suite:

- [fvtt-mcp-dnd5e](https://github.com/Txpple/fvtt-mcp-dnd5e): builds D&D 5e content in a live Foundry world from Claude Code: a stat block becomes a complete NPC, a map image a walled and lit scene, an adventure its journals, tables and handouts.
- [fvtt-mcp-imagegen](https://github.com/Txpple/fvtt-mcp-imagegen): makes the art with Google's Gemini image models: icons, tokens, props, portraits and illustrations, token redresses and restyles, battlemap and overland-map repaints, and the illustrated session records, all grounded in what the world already shows.
- [fvtt-mcp-sessionscribe](https://github.com/Txpple/fvtt-mcp-sessionscribe): turns a session's Discord recording and Foundry chat log into its record. Its end-to-end `session-scribe` skill drives the server from the Craig link to a speaker-labelled transcript, a fully illustrated player recap, combat statistics, GM notes and a party snapshot.

Issues are welcome on every repo in the family; pull requests are not accepted, since each is one
author's design for one table, shared because it might suit yours. How they fit together is mapped in [fvtt-suite-openroll5e](https://github.com/Txpple/fvtt-suite-openroll5e).
<!-- /openroll5e:family -->

## License

MIT. See [LICENSE](LICENSE).
