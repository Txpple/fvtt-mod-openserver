// Where "Jump to my character" goes (scripts/jump-decide.js).
import { decideJump, orderScenes, scenesWithToken } from "../scripts/jump-decide.js";

const scene = (id, extra = {}) => ({ id, name: id, tokenId: null, ...extra });

describe("the active scene wins", () => {
  it("jumps to the token on the active scene, whatever else has one", () => {
    const scenes = [
      scene("dungeon", { tokenId: "t1" }),
      scene("town", { active: true, tokenId: "t2" }),
      scene("ship", { tokenId: "t3" })
    ];
    expect(decideJump({ scenes, activeSceneId: "town" })).toEqual({
      kind: "jump",
      sceneId: "town",
      tokenId: "t2"
    });
  });

  it("reads the active scene from the flag when no id is given", () => {
    const scenes = [scene("a", { tokenId: "t1" }), scene("b", { active: true, tokenId: "t2" })];
    expect(decideJump({ scenes })).toEqual({ kind: "jump", sceneId: "b", tokenId: "t2" });
  });

  it("looks past an active scene with no token", () => {
    const scenes = [scene("town", { active: true }), scene("dungeon", { tokenId: "t1" })];
    expect(decideJump({ scenes, activeSceneId: "town" })).toEqual({
      kind: "jump",
      sceneId: "dungeon",
      tokenId: "t1"
    });
  });
});

describe("the viewed scene comes next", () => {
  const scenes = [
    scene("town", { active: true }),
    scene("attic", { tokenId: "t1" }),
    scene("camp", { tokenId: "t2" })
  ];

  it("jumps to the token on the scene the user is looking at, with no list", () => {
    expect(decideJump({ scenes, activeSceneId: "town", viewedSceneId: "attic" })).toEqual({
      kind: "jump",
      sceneId: "attic",
      tokenId: "t1"
    });
  });

  it("still lets the active scene win over the viewed one", () => {
    const both = [scene("town", { active: true, tokenId: "t0" }), ...scenes.slice(1)];
    expect(decideJump({ scenes: both, activeSceneId: "town", viewedSceneId: "attic" })).toEqual({
      kind: "jump",
      sceneId: "town",
      tokenId: "t0"
    });
  });

  it("lists when the viewed scene has no token either", () => {
    expect(decideJump({ scenes, activeSceneId: "town", viewedSceneId: "town" }).kind).toBe("list");
  });
});

describe("one scene jumps, several list", () => {
  it("jumps without a list when exactly one scene has a token", () => {
    const scenes = [scene("a"), scene("b", { tokenId: "t9" }), scene("c")];
    expect(decideJump({ scenes, activeSceneId: "a" })).toEqual({
      kind: "jump",
      sceneId: "b",
      tokenId: "t9"
    });
  });

  it("lists the scenes with a token, navigation-bar scenes first in bar order, then by name", () => {
    const scenes = [
      scene("Zeta Caves", { tokenId: "z" }),
      scene("Harbour", { navigation: true, navOrder: 20000, tokenId: "h" }),
      scene("Alpha Hall", { tokenId: "a" }),
      scene("Town", { active: true }),
      scene("Crypt", { navigation: true, navOrder: 10000, tokenId: "c" }),
      scene("Empty", { navigation: true, navOrder: 0 })
    ];
    expect(decideJump({ scenes, activeSceneId: "Town" })).toEqual({
      kind: "list",
      options: [
        { sceneId: "Crypt", name: "Crypt", tokenId: "c" },
        { sceneId: "Harbour", name: "Harbour", tokenId: "h" },
        { sceneId: "Alpha Hall", name: "Alpha Hall", tokenId: "a" },
        { sceneId: "Zeta Caves", name: "Zeta Caves", tokenId: "z" }
      ]
    });
  });

  it("orders scenes alone the same way", () => {
    const ordered = orderScenes([
      scene("b"),
      scene("nav2", { navigation: true, navOrder: 2 }),
      scene("a"),
      scene("nav1", { navigation: true, navOrder: 1 })
    ]);
    expect(ordered.map(s => s.id)).toEqual(["nav1", "nav2", "a", "b"]);
  });
});

describe("none", () => {
  it("is the answer when no scene has a token", () => {
    expect(
      decideJump({ scenes: [scene("a"), scene("b", { active: true })], activeSceneId: "b" })
    ).toEqual({
      kind: "none"
    });
  });

  it("holds for no scenes at all, and for holes in the list", () => {
    expect(decideJump({ scenes: [] })).toEqual({ kind: "none" });
    expect(decideJump({ scenes: [null, undefined] })).toEqual({ kind: "none" });
    expect(decideJump({})).toEqual({ kind: "none" });
  });
});

describe("reading the scenes", () => {
  it("takes the first token of the actor on each scene, or null", () => {
    const scenes = [
      {
        id: "a",
        name: "A",
        active: true,
        navigation: true,
        navOrder: 3,
        tokens: [{ id: "x", actorId: "other" }]
      },
      {
        id: "b",
        name: "B",
        tokens: [
          { id: "y", actorId: "pc" },
          { id: "z", actorId: "pc" }
        ]
      },
      null
    ];
    expect(scenesWithToken("pc", scenes)).toEqual([
      { id: "a", name: "A", active: true, navigation: true, navOrder: 3, tokenId: null },
      { id: "b", name: "B", active: false, navigation: false, navOrder: 0, tokenId: "y" }
    ]);
    expect(scenesWithToken("pc", undefined)).toEqual([]);
  });
});
