/**
 * Tool types and interfaces
 */

import type { ToolResult } from '../agent/types.js';

export interface Tool {
  name: string;
  description: string;
  execute(input: Record<string, any>, context?: any): Promise<ToolResult>;
}

export type ToolRegistry = Map<string, Tool>;

