/**
 * Server-side ClickUp API v2 client for HubEnts.
 *
 * Env: CLICKUP_API_TOKEN (required), CLICKUP_TEAM_ID, CLICKUP_MONITORING_LIST_ID
 *
 * @example
 * ```ts
 * import {
 *   getClickUpTask,
 *   getClickUpListTasks,
 *   updateClickUpTask,
 *   moveClickUpTaskToList,
 *   addClickUpTaskComment,
 *   getClickUpTaskComments,
 * } from "@/lib/clickup";
 * ```
 */

export {
  addClickUpTaskComment,
  clickUpRequest,
  createClickUpTask,
  getClickUpListTasks,
  getClickUpTask,
  getClickUpTaskComments,
  getClickUpTeamTasks,
  getClickUpWorkspaceTasks,
  getDefaultMonitoringListId,
  isClickUpConfigured,
  moveClickUpTaskToList,
  updateClickUpTask,
} from "./client";

export { getClickUpApiBase, getClickUpConfig } from "./config";
export { ClickUpApiError } from "./errors";
export type {
  ClickUpComment,
  ClickUpConfig,
  ClickUpTask,
  CreateTaskBody,
  ListTasksParams,
  UpdateTaskBody,
} from "./types";
