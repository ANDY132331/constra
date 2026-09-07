// Shared types for Ask Constra — imported by both the component and the API route.
// Kept in lib/ so there's no cross-boundary import from a client component into a route file.

export type ProjectSnap = {
  name: string;
  status: string;
  budget: number;
  spent: number;
  laborCost: number;
  revenue: number;
  progress: number;
  overdueTasks: number;
};

export type CompanySnap = {
  companyName: string;
  currency: string;
  currentDate: string;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueInvoices: Array<{ number: string; amount: number; client: string; daysOverdue: number }>;
  totalLaborCostThisMonth: number;
  totalHoursThisMonth: number;
  projects: ProjectSnap[];
  budgetByCategory: Array<{ category: string; budgeted: number; actual: number }>;
  workerCount: number;
  clockedInCount: number;
  equipmentTotal: number;
  equipmentInUse: number;
};
