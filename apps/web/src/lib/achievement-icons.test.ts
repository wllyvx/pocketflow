import { describe, expect, it } from "vitest";
import { getAchievementIcon, normalizeIconIdentifier } from "./achievement-icons";

describe("normalizeIconIdentifier", () => {
  it("converts PascalCase backend identifiers to kebab-case", () => {
    expect(normalizeIconIdentifier("FolderPlus")).toBe("folder-plus");
    expect(normalizeIconIdentifier("ListOrdered")).toBe("list-ordered");
    expect(normalizeIconIdentifier("ShieldCheck")).toBe("shield-check");
  });

  it("leaves kebab-case identifiers unchanged", () => {
    expect(normalizeIconIdentifier("flame")).toBe("flame");
    expect(normalizeIconIdentifier("trophy")).toBe("trophy");
  });
});

describe("getAchievementIcon", () => {
  it.each([
    ["FolderPlus", "folder-plus"],
    ["Receipt", "receipt"],
    ["Wallet", "wallet"],
    ["Flame", "flame"],
    ["ListOrdered", "list-ordered"],
    ["ShieldCheck", "shield-check"],
    ["Trophy", "trophy"],
    ["CheckCircle2", "circle-check"],
    ["RotateCw", "rotate-cw"],
  ])("maps %s to the %s lucide icon", (identifier, lucideClass) => {
    const svg = getAchievementIcon(identifier);
    expect(svg).toContain("<svg");
    expect(svg.toLowerCase()).toContain(`lucide-${lucideClass}`);
  });

  it("accepts already-kebab-case identifiers", () => {
    expect(getAchievementIcon("flame")).toContain("<svg");
  });

  it("returns an empty string for unknown identifiers", () => {
    expect(getAchievementIcon("Nonexistent")).toBe("");
  });
});
