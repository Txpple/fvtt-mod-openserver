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
 * The crosshair also reaches the character's creatures: what the character has summoned (dnd5e
 * stamps a summoned token with the summoning item's uuid) and anything else the user owns, each
 * while it has a token on some scene. With more than one choice the click opens a small menu,
 * the character first; with the character alone it jumps straight. A creature is never held back
 * by the stay rule: fetching it from another map is the point.
 *
 * Why this is allowed for a player: Scene#view carries no permission gate (probed on 14.364 and
 * again on 14.369), and a player controls their own character's tokens.
 */
import { candidatesOf, decideJump } from "./jump-decide.js";

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
  return button;
}

/** The scenes as candidatesOf wants them: plain data, the summon origin and the user's ownership read off each token. */
function sceneData(user) {
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  return game.scenes.map(scene => ({
    id: scene.id,
    name: scene.name,
    active: scene.active,
    navigation: scene.navigation,
    navOrder: scene.navOrder,
    tokens: scene.tokens.map(t => {
      const world = t.actorId ? game.actors.get(t.actorId) : null;
      const summon =
        t.delta?.flags?.dnd5e?.summon ?? t.actor?.flags?.dnd5e?.summon ?? world?.flags?.dnd5e?.summon;
      return {
        id: t.id,
        name: t.name,
        actorId: t.actorId,
        actorName: world?.name ?? t.actor?.name ?? t.name,
        summonOrigin: summon?.origin ?? null,
        owned: !!world && world.ownership?.[user.id] === OWNER
      };
    })
  }));
}

/** Who the row's crosshair can jump to. */
function candidatesFor(user) {
  const character = user.character;
  return candidatesOf({
    characterId: character?.id ?? null,
    characterName: character?.name ?? "",
    scenes: sceneData(user)
  });
}

const ICONS = { character: "fa-solid fa-user", summon: "fa-solid fa-paw", owned: "fa-solid fa-chess-knight" };

function jumpToCandidate(candidate) {
  jumpTo({ id: candidate.actorId, name: candidate.label }, candidate.scenes, candidate.kind !== "character").catch(
    err => {
      console.error(`${MODULE} | jump to ${candidate.label} failed`, err);
    }
  );
}

/** The crosshair's menu: one ContextMenu per Players element, its entries rebuilt on each open. */
const menus = new WeakMap();

function bindMenu(root) {
  const ContextMenu = foundry.applications?.ux?.ContextMenu;
  if (!ContextMenu) return false;
  if (menus.has(root)) return true;
  const menu = new ContextMenu(root, `.${BUTTON_CLASS}`, [], {
    eventName: "click",
    fixed: true,
    relative: "target",
    classes: ["openserver-jump-menu"],
    onOpen: target => {
      const user = game.users.get(target.closest("li.player")?.dataset.userId);
      const candidates = user ? candidatesFor(user) : [];
      if (candidates.length <= 1) {
        // Nothing to choose: jump straight and leave no empty menu behind.
        menu.menuItems = [];
        if (ui.context === menu) delete ui.context;
        if (candidates[0]) jumpToCandidate(candidates[0]);
        return;
      }
      menu.menuItems = candidates.map(c => ({
        name: c.label,
        icon: `<i class="${ICONS[c.kind] ?? ICONS.character}"></i>`,
        callback: () => {
          // Close before the scene draw starts, or the fade waits behind it.
          menu.close({ animate: false }).catch(() => {});
          jumpToCandidate(c);
        }
      }));
    }
  });
  menus.set(root, menu);
  return true;
}

/** Older cores (no ContextMenu in foundry.applications.ux): the pick list stands in for the menu. */
async function clickWithoutMenu(user) {
  const candidates = candidatesFor(user);
  if (candidates.length === 0) return;
  if (candidates.length === 1) return jumpToCandidate(candidates[0]);
  const name = user.character?.name ?? user.name;
  const picked = await pickOne({
    title: say("pick.title", { name }),
    content: say("pick.creature", { name }),
    options: candidates.map(c => ({ label: c.label, value: c }))
  });
  if (picked) jumpToCandidate(picked);
}

/** `html` is an HTMLElement on v13+ (ApplicationV2) and a jQuery collection before. */
function rootOf(html) {
  if (html instanceof HTMLElement) return html;
  return html?.[0] instanceof HTMLElement ? html[0] : null;
}

Hooks.on("renderPlayers", (_app, html) => {
  const root = rootOf(html);
  if (!root) return;
  const hasMenu = bindMenu(root);
  for (const row of root.querySelectorAll("li.player[data-user-id]")) {
    if (row.querySelector(`.${BUTTON_CLASS}`)) continue;
    const user = game.users.get(row.dataset.userId);
    const character = characterFor(user);
    if (!character) continue;
    const button = makeButton(character);
    if (!hasMenu) {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        clickWithoutMenu(user).catch(err => console.error(`${MODULE} | jump failed`, err));
      });
    }
    row.append(button);
  }
});

/**
 * Decide where the creature is and go there. `free` lifts the stay rule (a creature, or a GM).
 * @param {{ id: string, name: string }} actor
 * @param {JumpScene[]} scenes
 * @param {boolean} free
 */
export async function jumpTo(actor, scenes, free = false) {
  const decision = decideJump({
    scenes,
    activeSceneId: game.scenes.active?.id ?? null,
    viewedSceneId: canvas.scene?.id ?? null,
    isGM: free || game.user.isGM
  });
  if (decision.kind === "jump") return goTo(actor, decision.sceneId, decision.tokenId);
  if (decision.kind === "stay") {
    ui.notifications.info(say("stay", { name: actor.name }));
    return;
  }
  if (decision.kind === "none") {
    const active = game.scenes.active;
    if (active && !active.isView) await active.view();
    ui.notifications.info(say("none", { name: actor.name }));
    return;
  }
  const picked = await pickOne({
    title: say("pick.title", { name: actor.name }),
    content: say("pick.content", { name: actor.name }),
    options: decision.options.map(o => ({ label: o.name, value: o }))
  });
  if (picked) return goTo(actor, picked.sceneId, picked.tokenId);
}

/** View the scene, wait for the canvas, select the token and pan to it. */
async function goTo(character, sceneId, tokenId) {
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
 * A pick list: one radio per option with the first chosen, then Jump (Enter) and Cancel. Resolves
 * the chosen option's value, or null. One list at a time.
 * @param {{ title: string, content: string, options: { label: string, value: any }[] }} spec
 */
async function pickOne({ title, content, options }) {
  const { mine, previous } = claimPicker();
  if (previous) await previous.closeNow();
  if (mine.closed) return null;
  const esc = Handlebars.escapeExpression;
  const rows = options
    .map(
      (option, i) =>
        `<label class="openserver-jump-option"><input type="radio" name="pick" value="${i}"${i === 0 ? " checked" : ""}>` +
        `<span>${esc(option.label)}</span></label>`
    )
    .join("");
  const html = `<p>${esc(content)}</p><fieldset class="openserver-jump-pick">${rows}</fieldset>`;
  const chosen = form => {
    const value = form?.elements?.pick?.value;
    return value === undefined || value === "" ? null : (options[Number(value)]?.value ?? null);
  };
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if (DialogV2) {
    const picked = await DialogV2.wait({
      window: { title, icon: "fa-solid fa-crosshairs" },
      position: { width: 360 },
      content: html,
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
      content: html,
      buttons: {
        jump: { label: say("pick.jump"), callback: el => resolve(chosen(el[0]?.querySelector("form") ?? el[0])) },
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
