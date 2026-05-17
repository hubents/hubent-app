/**
 * Minimal ClickUp API v2 shapes used by Hubents.
 * @see https://developer.clickup.com/reference
 */

export interface ClickUpConfig {
  token: string;
  teamId: string;
  defaultListId: string;
}

export interface ClickUpTask {
  id: string;
  custom_id?: string | null;
  name?: string;
  description?: string;
  status?: { status?: string; type?: string; orderindex?: number } | string;
  orderindex?: string;
  date_created?: string;
  date_updated?: string;
  date_closed?: string | null;
  archived?: boolean;
  creator?: { id: number; username?: string; email?: string };
  assignees?: Array<{ id: number; username?: string; email?: string }>;
  url?: string;
  list?: { id: string; name?: string };
  priority?: { id?: string; priority?: string } | null;
  [key: string]: unknown;
}

export interface ClickUpComment {
  id: string;
  comment_text: string;
  user: { id: number; username?: string; email?: string };
  date: string;
  resolved?: boolean;
  reply_count?: number;
}

export interface ListTasksParams {
  archived?: boolean;
  page?: number;
  order_by?: "id" | "created" | "updated" | "due_date";
  reverse?: boolean;
  subtasks?: boolean;
  include_closed?: boolean;
}

/** Body for PUT /task/{task_id} — only include fields you want to change */
export interface UpdateTaskBody {
  name?: string;
  description?: string;
  /** Status name as shown in ClickUp for that list */
  status?: string;
  priority?: number | null;
  due_date?: number | null;
  start_date?: number | null;
  time_estimate?: number | null;
  /** Move task to another list */
  list_id?: string;
  archived?: boolean;
}

export interface CreateTaskBody {
  name: string;
  description?: string;
  status?: string;
  priority?: number;
  tags?: string[];
  due_date?: number;
  start_date?: number;
}
