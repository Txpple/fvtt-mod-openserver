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
 *
 * The active scene wins because that is where the table is; a token there is the one the player
 * means even when a copy stands somewhere else. The viewed scene comes next: a player on a side
 * map with their own token in front of them wants it selected, not a question.
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
 * @param {{ scenes: JumpScene[], activeSceneId?: string | null, viewedSceneId?: string | null }} input
 * @returns {{ kind: "jump", sceneId: string, tokenId: string } | { kind: "list", options: { sceneId: string, name: string, tokenId: string }[] } | { kind: "none" }}
 */
export function decideJump({ scenes, activeSceneId = null, viewedSceneId = null }) {
  const withToken = (scenes ?? []).filter(s => s?.tokenId);
  const active = withToken.find(s => s.id === activeSceneId || (activeSceneId == null && s.active));
  if (active) return { kind: "jump", sceneId: active.id, tokenId: active.tokenId };
  const viewed = viewedSceneId ? withToken.find(s => s.id === viewedSceneId) : null;
  if (viewed) return { kind: "jump", sceneId: viewed.id, tokenId: viewed.tokenId };
  if (withToken.length === 0) return { kind: "none" };
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
