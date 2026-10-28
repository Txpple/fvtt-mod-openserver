/**
 * Open Server — Jump to my character
 *
 * A crosshair beside a name in the Players list (bottom left). A player's jumps to their own
 * assigned character; a GM sees one beside every player who has one. The click runs on the
 * clicking user's client alone and writes nothing: it views the scene the character's token is
 * on, selects the token and pans to it. Which token: the one on the ACTIVE scene; failing that,
 * the one scene that has one; several scenes ask (a small dialog, one button per scene); none
 * says so and shows the active scene. The rule itself is scripts/jump-decide.js, with no Foundry
 * in it, so it has tests.
 *
 * Why this is allowed for a player: Scene#view carries no permission gate (the landing scene
 * rests on the same fact), and a player controls their own character's tokens.
 */
import { decideJump, scenesWithToken } from "./jump-decide.js";

const MODULE = "fvtt-mod-openserver";
const BUTTON_CLASS = "openserver-jump";

const say = (key, data) => game.i18n.format(`${MODULE}.jump.${key}`, data ?? {});

/** The row's user may jump when it is their own row, or they are a GM; the row needs a character. */
function characterFor(user) {
  if (!user?.character) return null;
  if (!(user.isSelf || game.user.isGM)) return null;
  return user.character;
}

function makeButton(character) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `${BUTTON_CLASS} icon fa-solid fa-crosshairs`;
  const label = say("tooltip", { name: character.name });
  button.setAttribute("aria-label", label);
  // v13+ reads data-tooltip-text as text; older cores read data-tooltip as HTML, so it is escaped.
  button.dataset.tooltipText = label;
  if ((game.release?.generation ?? 0) < 13) {
    button.dataset.tooltip = Handlebars.escapeExpression(label);
  }
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    jumpToCharacter(character).catch(err => {
      console.error(`${MODULE} | jump to ${character.name} failed`, err);
    });
  });
  return button;
}

/** `html` is an HTMLElement on v13+ (ApplicationV2) and a jQuery collection before. */
function rootOf(html) {
  if (html instanceof HTMLElement) return html;
  return html?.[0] instanceof HTMLElement ? html[0] : null;
}

Hooks.on("renderPlayers", (_app, html) => {
  const root = rootOf(html);
  if (!root) return;
  for (const row of root.querySelectorAll("li.player[data-user-id]")) {
    if (row.querySelector(`.${BUTTON_CLASS}`)) continue;
    const character = characterFor(game.users.get(row.dataset.userId));
    if (!character) continue;
    row.append(makeButton(character));
  }
});

/**
 * Decide where the character is and go there.
 * @param {Actor} character
 */
export async function jumpToCharacter(character) {
  const decision = decideJump({
    scenes: scenesWithToken(character.id, game.scenes),
    activeSceneId: game.scenes.active?.id ?? null
  });
  if (decision.kind === "jump") return jumpTo(character, decision.sceneId, decision.tokenId);
  if (decision.kind === "none") {
    const active = game.scenes.active;
    if (active && !active.isView) await active.view();
    ui.notifications.info(say("none", { name: character.name }));
    return;
  }
  const picked = await pickScene(character, decision.options);
  if (picked) return jumpTo(character, picked.sceneId, picked.tokenId);
}

/** View the scene, wait for the canvas, select the token and pan to it. */
async function jumpTo(character, sceneId, tokenId) {
  const scene = game.scenes.get(sceneId);
  if (!scene) return;
  if (game.settings.get("core", "noCanvas")) {
    await scene.view();
    return;
  }
  if (!scene.isView) await scene.view();
  if (canvas.scene?.id !== scene.id) {
    // The core refuses a switch while its loader runs (and warns); nothing to select here.
    ui.notifications.warn(say("busy"));
    return;
  }
  if (!canvas.ready) await new Promise(resolve => Hooks.once("canvasReady", resolve));
  const token = canvas.tokens?.get(tokenId);
  if (!token) {
    ui.notifications.warn(say("gone", { name: character.name, scene: scene.name }));
    return;
  }
  if (!canvas.tokens.active) canvas.tokens.activate();
  token.control({ releaseOthers: true });
  const { x, y } = token.center;
  await canvas.animatePan({ x, y });
}

/**
 * Several scenes have a token: one button per scene, plus cancel. Resolves the option, or null.
 * @returns {Promise<{ sceneId: string, name: string, tokenId: string } | null>}
 */
async function pickScene(character, options) {
  const title = say("pick.title", { name: character.name });
  const content = `<p>${Handlebars.escapeExpression(say("pick.content", { name: character.name }))}</p>`;
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2) {
    const picked = await DialogV2.wait({
      window: { title, icon: "fa-solid fa-crosshairs" },
      position: { width: 420 },
      content,
      buttons: [
        ...options.map((option, i) => ({
          action: `scene-${i}`,
          label: option.name,
          icon: "fa-solid fa-map",
          callback: () => option
        })),
        { action: "cancel", label: say("pick.cancel"), icon: "fa-solid fa-xmark", callback: () => null }
      ],
      rejectClose: false
    });
    return picked ?? null;
  }
  // Foundry 11: the legacy Dialog.
  return new Promise(resolve => {
    const buttons = {};
    options.forEach((option, i) => {
      buttons[`scene-${i}`] = { label: option.name, callback: () => resolve(option) };
    });
    buttons.cancel = { label: say("pick.cancel"), callback: () => resolve(null) };
    new Dialog({ title, content, buttons, default: "cancel", close: () => resolve(null) }).render(true);
  });
}
