import {
  getClickUpApiBase,
  getClickUpConfig,
  isClickUpConfigured,
} from "./config";
import { ClickUpApiError } from "./errors";
import type {
  ClickUpComment,
  ClickUpTask,
  CreateTaskBody,
  ListTasksParams,
  UpdateTaskBody,
} from "./types";

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

/**
 * Low-level JSON request to ClickUp API v2.
 * Authorization: raw personal token (not Bearer), per ClickUp docs.
 */
export async function clickUpRequest<T>(
  path: string,
  init: RequestInit & { parseJson?: boolean } = {},
): Promise<T> {
  const { token } = getClickUpConfig();
  if (!token) {
    throw new ClickUpApiError("CLICKUP_API_TOKEN is not configured", 0, "");
  }

  const url = `${getClickUpApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const { parseJson = true, ...rest } = init;

  const response = await fetch(url, {
    ...rest,
    headers: {
      Authorization: token,
      Accept: "application/json",
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new ClickUpApiError(
      `ClickUp API ${response.status}: ${text.slice(0, 500)}`,
      response.status,
      text,
    );
  }

  if (!parseJson || !text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ClickUpApiError(
      "Invalid JSON from ClickUp API",
      response.status,
      text,
    );
  }
}

/** GET /task/{task_id} — task_id can be custom id (e.g. 86afx36wc) or internal id */
export async function getClickUpTask(taskId: string): Promise<ClickUpTask> {
  return clickUpRequest<ClickUpTask>(`/task/${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
}

/** GET /list/{list_id}/task */
export async function getClickUpListTasks(
  listId: string,
  params: ListTasksParams = {},
): Promise<{ tasks: ClickUpTask[] }> {
  const q = buildQuery({
    archived: params.archived ?? false,
    page: params.page,
    order_by: params.order_by,
    reverse: params.reverse,
    subtasks: params.subtasks,
    include_closed: params.include_closed,
  });
  return clickUpRequest<{ tasks: ClickUpTask[] }>(
    `/list/${encodeURIComponent(listId)}/task${q}`,
    { method: "GET" },
  );
}

/** GET /team/{team_id}/task — filtered team tasks (paginated, max 100 per page) */
export async function getClickUpTeamTasks(
  teamId: string,
  params: ListTasksParams = {},
): Promise<{ tasks: ClickUpTask[] }> {
  const q = buildQuery({
    archived: params.archived ?? false,
    page: params.page,
    order_by: params.order_by,
    reverse: params.reverse,
    subtasks: params.subtasks,
    include_closed: params.include_closed,
  });
  return clickUpRequest<{ tasks: ClickUpTask[] }>(
    `/team/${encodeURIComponent(teamId)}/task${q}`,
    { method: "GET" },
  );
}

/** Same as getClickUpTeamTasks using CLICKUP_TEAM_ID from env (default 90132561531). */
export async function getClickUpWorkspaceTasks(
  params: ListTasksParams = {},
): Promise<{ tasks: ClickUpTask[] }> {
  const { teamId } = getClickUpConfig();
  return getClickUpTeamTasks(teamId, params);
}

/** PUT /task/{task_id} — update fields and/or move list (list_id) */
export async function updateClickUpTask(
  taskId: string,
  body: UpdateTaskBody,
): Promise<ClickUpTask> {
  return clickUpRequest<ClickUpTask>(`/task/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** Move task to another list (wrapper over update) */
export async function moveClickUpTaskToList(
  taskId: string,
  listId: string,
): Promise<ClickUpTask> {
  return updateClickUpTask(taskId, { list_id: listId });
}

/** POST /task/{task_id}/comment */
export async function addClickUpTaskComment(
  taskId: string,
  commentText: string,
  options?: { assignee?: number; notify_all?: boolean },
): Promise<{ id: string; [key: string]: unknown }> {
  const payload: Record<string, unknown> = {
    comment_text: commentText,
    notify_all: options?.notify_all ?? false,
  };
  if (options?.assignee != null) {
    payload.assignee = options.assignee;
  }
  return clickUpRequest(`/task/${encodeURIComponent(taskId)}/comment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /task/{task_id}/comment */
export async function getClickUpTaskComments(taskId: string): Promise<{
  comments: ClickUpComment[];
}> {
  return clickUpRequest(`/task/${encodeURIComponent(taskId)}/comment`, {
    method: "GET",
  });
}

/** POST /list/{list_id}/task — create task (e.g. monitoring tickets) */
export async function createClickUpTask(
  listId: string,
  body: CreateTaskBody,
): Promise<ClickUpTask> {
  return clickUpRequest<ClickUpTask>(
    `/list/${encodeURIComponent(listId)}/task`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

/** Default monitoring list from env */
export function getDefaultMonitoringListId(): string {
  return getClickUpConfig().defaultListId;
}

export { isClickUpConfigured };
