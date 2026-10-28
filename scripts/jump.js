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
 * A player already on the active scene is not taken off it: the table is there, so the button only
 * says where the token is. A GM jumps from anywhere to anywhere.
 *
 * Why this is allowed for a player: Scene#view carries no permission gate (probed on 14.364 and
 * again on 14.369), and a player controls their own character's tokens.
 */
import { decideJump, scenesWithToken } from "./jump-decide.js";

const MODULE = "fvtt-mod-openserver";
const BUTTON_CLASS = "openserver-jump";

const say = (key, data) => game.i18n.format(`${MODULE}.jump.${key}`, data ?? {});

/**
 * The one pick list. A click claims the slot synchronously, so a burst of clicks closes whatever
 * came before it (each resolving null) and leaves exactly one list open.
 */
let picker = null;

function claimPicker() {
  const previous = picker;
  const mine = {
    dialog: null,
    closed: false,
    async closeNow() {
      mine.closed = true;
      if (mine.dialog) {
        try {
          await mine.dialog.close();
        } catch (err) {
          console.error(`${MODULE} | could not close the previous pick list`, err);
        }
      }
    },
    attach(dialog) {
      mine.dialog = dialog;
      if (mine.closed) mine.closeNow().catch(() => {});
    },
    release() {
      if (picker === mine) picker = null;
    }
  };
  picker = mine;
  return { mine, previous };
}

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
    activeSceneId: game.scenes.active?.id ?? null,
    viewedSceneId: canvas.scene?.id ?? null,
    isGM: game.user.isGM
  });
  if (decision.kind === "jump") return jumpTo(character, decision.sceneId, decision.tokenId);
  if (decision.kind === "stay") {
    ui.notifications.info(say("stay", { name: character.name }));
    return;
  }
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
 * Several scenes have a token: a pick list, one radio per scene with the first chosen, then Jump
 * (Enter) and Cancel. Resolves the option, or null.
 * @returns {Promise<{ sceneId: string, name: string, tokenId: string } | null>}
 */
async function pickScene(character, options) {
  const { mine, previous } = claimPicker();
  if (previous) await previous.closeNow();
  if (mine.closed) return null;
  const esc = Handlebars.escapeExpression;
  const title = say("pick.title", { name: character.name });
  const rows = options
    .map(
      (option, i) =>
        `<label class="openserver-jump-option"><input type="radio" name="scene" value="${i}"${i === 0 ? " checked" : ""}>` +
        `<span>${esc(option.name)}</span></label>`
    )
    .join("");
  const content =
    `<p>${esc(say("pick.content", { name: character.name }))}</p>` +
    `<fieldset class="openserver-jump-pick">${rows}</fieldset>`;
  const chosen = form => {
    const value = form?.elements?.scene?.value;
    return value === undefined || value === "" ? null : (options[Number(value)] ?? null);
  };
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2) {
    const picked = await DialogV2.wait({
      window: { title, icon: "fa-solid fa-crosshairs" },
      position: { width: 360 },
      content,
      render: (_event, dialog) => mine.attach(dialog),
      close: () => mine.release(),
      buttons: [
        {
          action: "jump",
          label: say("pick.jump"),
          icon: "fa-solid fa-crosshairs",
          default: true,
          callback: (_event, button) => chosen(button.form)
        },
        { action: "cancel", label: say("pick.cancel"), icon: "fa-solid fa-xmark", callback: () => null }
      ],
      rejectClose: false
    });
    return mine.closed ? null : (picked ?? null);
  }
  // Foundry 11: the legacy Dialog.
  return new Promise(resolve => {
    const dialog = new Dialog({
      title,
      content,
      buttons: {
        jump: { label: say("pick.jump"), callback: html => resolve(chosen(html[0]?.querySelector("form") ?? html[0])) },
        cancel: { label: say("pick.cancel"), callback: () => resolve(null) }
      },
      default: "jump",
      close: () => {
        mine.release();
        resolve(null);
      }
    });
    mine.attach(dialog);
    dialog.render(true);
  });
}
