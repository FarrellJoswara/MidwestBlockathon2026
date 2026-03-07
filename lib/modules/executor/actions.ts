/**
 * Executor module — API paths and types for executor-only actions.
 * Used by ExecutorDashboard: declare death, distribute, update will.
 */

export type ExecutorAction = "declare_death" | "distribute" | "update";

export const executorApiPaths = {
  declareDeath: (willId: string) => `/api/wills/${willId}/declare-death`,
  distribute: (willId: string) => `/api/wills/${willId}/distribute`,
  update: (willId: string) => `/api/wills/${willId}/update`,
  getWill: (willId: string) => `/api/wills/${willId}`,
} as const;
