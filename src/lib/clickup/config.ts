import type { ClickUpConfig } from "./types";

const API_BASE = "https://api.clickup.com/api/v2";

/**
 * Workspace team id (Napsix AI). Used for team-scoped endpoints.
 * @see .env.example — CLICKUP_TEAM_ID
 */
export function getClickUpConfig(): ClickUpConfig {
  const token = (process.env.CLICKUP_API_TOKEN || "").trim();
  const teamId = (process.env.CLICKUP_TEAM_ID || "90132561531").trim();
  const defaultListId = (
    process.env.CLICKUP_MONITORING_LIST_ID || "901322179370"
  ).trim();

  return { token, teamId, defaultListId };
}

export function isClickUpConfigured(): boolean {
  return Boolean(getClickUpConfig().token);
}

export function getClickUpApiBase(): string {
  return API_BASE;
}
