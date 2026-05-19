import { execSync } from 'child_process';
import { logger } from '../../utils/logger.js';
import { buildIsolatedEnv } from '../../shared/EnvManager.js';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH, OBSERVER_SESSIONS_DIR, ensureDir } from '../../shared/paths.js';
import { sanitizeEnv } from '../../supervisor/env-sanitizer.js';

// @ts-ignore - Agent SDK types may not be available
import { query } from '@anthropic-ai/claude-agent-sdk';

// Tools blocked in business agent subprocess — file system and shell access
// MCP tools (Apollo, Gmail, Canva) are allowed by default via Claude's MCP config
const DISALLOWED_TOOLS = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Grep',
  'Glob',
  'NotebookEdit',
  'Task',
  'AskUserQuestion',
  'TodoWrite',
];

function findClaudeExecutable(): string {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  if (settings.CLAUDE_CODE_PATH) {
    return settings.CLAUDE_CODE_PATH;
  }
  if (process.platform === 'win32') {
    try {
      execSync('where claude.cmd', { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      return 'claude.cmd';
    } catch { /* fall through */ }
  }
  try {
    const found = execSync(
      process.platform === 'win32' ? 'where claude' : 'which claude',
      { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim().split('\n')[0].trim();
    if (found) return found;
  } catch { /* fall through */ }
  throw new Error('Claude executable not found. Set CLAUDE_CODE_PATH in ~/.claude-mem/settings.json');
}

/**
 * Run a one-shot Claude subprocess with MCP tool access (Apollo, Gmail, Canva).
 * Returns the full concatenated assistant text response.
 */
export async function runBusinessAgent(prompt: string, timeoutMs = 120_000): Promise<string> {
  const claudePath = findClaudeExecutable();
  const isolatedEnv = sanitizeEnv(buildIsolatedEnv());
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  const modelId = settings.CLAUDE_MEM_MODEL;

  ensureDir(OBSERVER_SESSIONS_DIR);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  logger.info('BUSINESS', 'Starting business agent', { promptLength: prompt.length });

  const textParts: string[] = [];

  try {
    const result = query({
      prompt,
      options: {
        model: modelId,
        cwd: OBSERVER_SESSIONS_DIR,
        disallowedTools: DISALLOWED_TOOLS,
        abortController,
        pathToClaudeCodeExecutable: claudePath,
        env: isolatedEnv,
      }
    });

    for await (const message of result) {
      if (message.type === 'assistant') {
        const content = message.message?.content;
        const text = Array.isArray(content)
          ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
          : typeof content === 'string' ? content : '';
        if (text) textParts.push(text);
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  const response = textParts.join('\n').trim();
  logger.info('BUSINESS', 'Business agent completed', { responseLength: response.length });
  return response;
}
