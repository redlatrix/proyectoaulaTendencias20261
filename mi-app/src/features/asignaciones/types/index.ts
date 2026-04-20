export interface Assignment {
  id: number;
  resource: number;
  resource_code: string;
  assignee: number | null;
  assignee_name: string;
  start_date: string;
  expected_return_date: string | null;
  returned_at: string | null;
  notes: string;
}

export interface AssignmentFormData {
  resource: number | '';
  assignee: number | '';
  start_date: string;
  expected_return_date: string;
  notes: string;
}

export const isActive = (a: Assignment) => a.returned_at === null;
