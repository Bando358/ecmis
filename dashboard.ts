// types/dashboard.ts
export interface DashboardFilters {
  startDate: string;
  endDate: string;
  period: string;
  cliniqueId: string;
  prescripteurId: string;
}

export interface Clinique {
  id: string;
  name: string;
}

export interface Prescripteur {
  id: string;
  name: string;
  cliniqueId: string;
}
