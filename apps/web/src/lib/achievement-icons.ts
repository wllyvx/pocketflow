import { Flame, FolderPlus, ListOrdered, Receipt, ShieldCheck, Trophy, Wallet } from "lucide-static";

const ICON_MAP: Record<string, string> = {
  "folder-plus": FolderPlus,
  receipt: Receipt,
  wallet: Wallet,
  flame: Flame,
  "list-ordered": ListOrdered,
  "shield-check": ShieldCheck,
  trophy: Trophy,
};

export function normalizeIconIdentifier(identifier: string): string {
  return identifier.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function getAchievementIcon(identifier: string): string {
  return ICON_MAP[normalizeIconIdentifier(identifier)] ?? "";
}
