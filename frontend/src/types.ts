export interface Assignment {
  assignment_id: number
  employee_id: number
  status: string
  report: string | null
}

export interface Task {
  task_id: number
  title: string
  description: string
  priority: string
  deadline: string | null
  created_by: number
  assignments: Assignment[]
}

export interface Stats {
  completion_rate: number
  tasks_this_week: number
  overdue: number
  active_members: number
  completed_per_day: { day: string; count: number }[]
  workload: { employee_id: number; full_name: string; done: number; total: number }[]
}

export interface AppNotification {
  notification_id: number
  task_id: number
  message: string
  is_read: boolean
  created_at: string
}

export interface Employee {
  user_id: number
  full_name: string
  email: string
}

export interface ReportItem {
  assignment_id: number
  task_id: number
  employee_id: number
  report: string | null
  report_sent_at: string | null
}
