export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-envelope",
    name: "Envelope Beginner",
    description: "Create your very first budgeting envelope.",
    icon: "FolderPlus",
    tier: "bronze",
  },
  {
    id: "first-transaction",
    name: "First Step",
    description: "Log your first transaction.",
    icon: "Receipt",
    tier: "bronze",
  },
  {
    id: "all-envelopes-funded",
    name: "Fully Loaded",
    description: "Have all active envelopes funded with non-zero amounts.",
    icon: "CheckCircle2",
    tier: "silver",
  },
  {
    id: "7-day-streak",
    name: "Consistent Saver",
    description: "Maintain a 7-day activity streak.",
    icon: "Flame",
    tier: "silver",
  },
  {
    id: "10-transactions",
    name: "Transaction Master",
    description: "Log 10 or more transactions.",
    icon: "ListOrdered",
    tier: "silver",
  },
  {
    id: "budget-cycle-complete",
    name: "Cycle Surfer",
    description: "Complete a full budget cycle successfully.",
    icon: "RotateCw",
    tier: "gold",
  },
  {
    id: "30-day-streak",
    name: "Unstoppable",
    description: "Maintain a 30-day activity streak.",
    icon: "Trophy",
    tier: "platinum",
  },
];
