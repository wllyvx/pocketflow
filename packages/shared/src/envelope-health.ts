export type HealthStatus = 
  | 'surplus'
  | 'healthy'
  | 'low'
  | 'depleted'
  | 'over-spending'
  | 'not-funded';

export interface HealthBarData {
  percentage: number;          // 0-100, capped at 100
  status: HealthStatus;
  color: string;               // Bar fill color
  badgeColor: string;          // Badge background color
  badgeTextColor: string;      // Badge text color
  showBadge: boolean;          // Whether to show status badge
  badgeText: string;           // Badge label text
  spent: number;               // budgetedAmount - currentAmount
  surplus: number;             // If surplus, amount over budget (0 otherwise)
  overSpending: number;        // If over-spending, amount over budget (0 otherwise)
}

export function calculateEnvelopeHealth(
  budgetedAmount: number,
  currentAmount: number
): HealthBarData {
  // Calculate health percentage
  const healthPercentage = budgetedAmount > 0 
    ? (currentAmount / budgetedAmount) * 100 
    : 0;
  const percentage = Math.min(100, Math.max(0, healthPercentage));

  // Determine health status
  let status: HealthStatus;
  
  if (currentAmount === 0 && budgetedAmount > 0) {
    // Check if it's "not-funded" (never had money) vs "depleted" (had money, spent it)
    // For this initial state, we treat currentAmount === 0 with budgetedAmount > 0 as not-funded
    status = 'not-funded';
  } else if (currentAmount > budgetedAmount) {
    status = 'surplus';
  } else if (currentAmount < 0) {
    status = 'over-spending';
  } else if (currentAmount === 0) {
    status = 'depleted';
  } else if (currentAmount <= budgetedAmount * 0.3) {
    status = 'low';
  } else {
    status = 'healthy';
  }

  // Determine colors based on status
  const colorMap: Record<HealthStatus, string> = {
    'healthy': '#10b981',      // Tailwind green-500
    'low': '#f59e0b',          // Tailwind amber-500
    'depleted': '#ef4444',     // Tailwind red-500
    'over-spending': '#ef4444', // Tailwind red-500
    'surplus': '#4f46e5',      // primary.500
    'not-funded': '#6b7280',   // Tailwind gray-500
  };

  const color = colorMap[status];

  // Determine badge data
  let showBadge = false;
  let badgeText = '';
  let badgeColor = '';
  let badgeTextColor = '';

  if (status === 'surplus') {
    showBadge = true;
    badgeText = 'SURPLUS';
    badgeColor = '#EEF2FF';
    badgeTextColor = '#4F46E5';
  } else if (status === 'over-spending') {
    showBadge = true;
    badgeText = 'OVER SPENDING';
    badgeColor = '#FDE8E2';
    badgeTextColor = '#C6533D';
  } else if (status === 'not-funded') {
    showBadge = true;
    badgeText = 'Not Funded';
    badgeColor = '#F3F4F6';
    badgeTextColor = '#6B7280';
  }

  // Calculate spent, surplus, and overSpending amounts
  const spent = budgetedAmount - currentAmount;
  const surplus = status === 'surplus' ? currentAmount - budgetedAmount : 0;
  const overSpending = status === 'over-spending' ? Math.abs(currentAmount) : 0;

  return {
    percentage,
    status,
    color,
    badgeColor,
    badgeTextColor,
    showBadge,
    badgeText,
    spent,
    surplus,
    overSpending,
  };
}
