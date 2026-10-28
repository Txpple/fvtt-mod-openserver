/**
 * Where "Jump to my character" goes: the one decision, with no Foundry in it.
 *
 * The caller hands over every scene with, per scene, the id of the character's token there (or
 * null), and the active scene's id. The answer is one of three:
 *
 *   { kind: "jump", sceneId, tokenId }   the active scene has a token, else the scene the user is
 *                                        viewing has one, else exactly one scene does
 *   { kind: "list", options: [...] }     several scenes have one, neither the active nor the viewed
 *                                        among them; each option is { sceneId, name, tokenId },
 *                                        navigation-bar scenes first in bar order, then the rest
 *                                        by name
 *   { kind: "none" }                     the character has no token on any scene
 *   { kind: "stay" }                     a player (not a GM) is on the active scene and the token is
 *                                        elsewhere: the table is here, so they stay and are told
 *
 * The active scene wins because that is where the table is; a token there is the one the player
 * means even when a copy stands somewhere else. The viewed scene comes next: a player on a side
 * map with their own token in front of them wants it selected, not a question. And a player who
 * is already with the table is not taken off it; only a GM jumps from the active scene to a side
 * map.
 */

/** @typedef {{ id: string, name: string, active?: boolean, navigation?: boolean, navOrder?: number, tokenId: string | null | undefined }} JumpScene */

/**
 * Order scenes as the player sees them: the navigation bar's in bar order, then the rest by name.
 * @param {JumpScene[]} scenes
 * @returns {JumpScene[]}
 */
export function orderScenes(scenes) {
  const inBar = scenes.filter(s => s.navigation).sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0));
  const rest = scenes
    .filter(s => !s.navigation)
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  return [...inBar, ...rest];
}

/**
 * @param {{ scenes: JumpScene[], activeSceneId?: string | null, viewedSceneId?: string | null, isGM?: boolean }} input
 * @returns {{ kind: "jump", sceneId: string, tokenId: string } | { kind: "list", options: { sceneId: string, name: string, tokenId: string }[] } | { kind: "none" } | { kind: "stay" }}
 */
export function decideJump({ scenes, activeSceneId = null, viewedSceneId = null, isGM = false }) {
  const withToken = (scenes ?? []).filter(s => s?.tokenId);
  const activeId = activeSceneId ?? (scenes ?? []).find(s => s?.active)?.id ?? null;
  const active = withToken.find(s => s.id === activeId);
  if (active) return { kind: "jump", sceneId: active.id, tokenId: active.tokenId };
  const viewed = viewedSceneId ? withToken.find(s => s.id === viewedSceneId) : null;
  if (viewed) return { kind: "jump", sceneId: viewed.id, tokenId: viewed.tokenId };
  if (withToken.length === 0) return { kind: "none" };
  if (!isGM && activeId && viewedSceneId === activeId) return { kind: "stay" };
  if (withToken.length === 1) {
    return { kind: "jump", sceneId: withToken[0].id, tokenId: withToken[0].tokenId };
  }
  return {
    kind: "list",
    options: orderScenes(withToken).map(s => ({ sceneId: s.id, name: s.name, tokenId: s.tokenId }))
  };
}

/**
 * The scenes as decideJump wants them, from any iterable of scene-like objects whose `tokens`
 * iterate `{ id, actorId }`: the first token of the actor on each scene, or null.
 * @param {string} actorId
 * @param {Iterable<{ id: string, name: string, active?: boolean, navigation?: boolean, navOrder?: number, tokens: Iterable<{ id: string, actorId?: string | null }> }>} scenes
 * @returns {JumpScene[]}
 */
export function scenesWithToken(actorId, scenes) {
  const out = [];
  for (const scene of scenes ?? []) {
    if (!scene) continue;
    let tokenId = null;
    for (const token of scene.tokens ?? []) {
      if (token?.actorId === actorId) {
        tokenId = token.id;
        break;
      }
    }
    out.push({
      id: scene.id,
      name: scene.name,
      active: !!scene.active,
      navigation: !!scene.navigation,
      navOrder: scene.navOrder ?? 0,
      tokenId
    });
  }
  return out;
}

/**
 * Who the crosshair can jump to for one user: the assigned character first (always, so the "none"
 * notice can speak), then the creatures the character has summoned (dnd5e stamps a summoned token's
 * actor with `flags.dnd5e.summon.origin`, the summoning item's uuid under the character), then any
 * other actor the user owns outright; a creature counts only while it has a token on some scene.
 * Summons and owned creatures are named by their token when every token agrees, else by the actor.
 *
 * `scenes` is plain data: each `{ id, name, active, navigation, navOrder, tokens }` with tokens
 * `{ id, name, actorId, actorName, summonOrigin, owned }` (`owned`: the user owns the token's actor
 * explicitly). The result is one entry per creature with its `scenes` ready for decideJump.
 *
 * @param {{ characterId: string | null, characterName?: string, scenes: Array<object> }} input
 * @returns {Array<{ actorId: string, label: string, kind: "character" | "summon" | "owned", scenes: JumpScene[] }>}
 */
export function candidatesOf({ characterId = null, characterName = "", scenes }) {
  const all = (scenes ?? []).filter(Boolean);
  const bare = s => ({
    id: s.id,
    name: s.name,
    active: !!s.active,
    navigation: !!s.navigation,
    navOrder: s.navOrder ?? 0
  });
  const found = new Map(); // actorId -> { kind, actorName, tokenNames: Set, perScene: Map<sceneId, tokenId> }
  const summonPrefix = characterId ? `Actor.${characterId}.` : null;
  for (const scene of all) {
    for (const token of scene.tokens ?? []) {
      if (!token?.actorId || token.actorId === characterId) continue;
      const summoned = summonPrefix && String(token.summonOrigin ?? "").startsWith(summonPrefix);
      if (!summoned && !token.owned) continue;
      let entry = found.get(token.actorId);
      if (!entry) {
        entry = { kind: summoned ? "summon" : "owned", actorName: token.actorName ?? "", tokenNames: new Set(), perScene: new Map() };
        found.set(token.actorId, entry);
      } else if (summoned && entry.kind === "owned") entry.kind = "summon";
      if (token.name) entry.tokenNames.add(token.name);
      if (!entry.perScene.has(scene.id)) entry.perScene.set(scene.id, token.id);
    }
  }
  const out = [];
  if (characterId) {
    out.push({
      actorId: characterId,
      label: characterName,
      kind: "character",
      scenes: all.map(s => ({
        ...bare(s),
        tokenId: (s.tokens ?? []).find(t => t?.actorId === characterId)?.id ?? null
      }))
    });
  }
  const others = [...found.entries()].map(([actorId, e]) => ({
    actorId,
    label: e.tokenNames.size === 1 ? [...e.tokenNames][0] : e.actorName || [...e.tokenNames][0] || actorId,
    kind: e.kind,
    scenes: all.map(s => ({ ...bare(s), tokenId: e.perScene.get(s.id) ?? null }))
  }));
  const rank = { summon: 0, owned: 1 };
  others.sort((a, b) => rank[a.kind] - rank[b.kind] || a.label.localeCompare(b.label));
  return [...out, ...others];
}
