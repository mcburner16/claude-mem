import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { Database } from 'bun:sqlite';
import { logger } from '../../utils/logger.js';
import { runBusinessAgent } from './BusinessAgentRunner.js';
import type { BusinessStrategy, Prospect } from './types.js';

const QUOTA_FILE = join(homedir(), '.claude-mem', 'business-quota.json');
const MONTHLY_EXPORT_LIMIT = 45;

interface QuotaState {
  exportsThisMonth: number;
  resetEpoch: number;
}

function loadQuota(): QuotaState {
  try {
    if (existsSync(QUOTA_FILE)) {
      const data = JSON.parse(readFileSync(QUOTA_FILE, 'utf-8'));
      const now = Date.now();
      if (now > data.resetEpoch) {
        return { exportsThisMonth: 0, resetEpoch: nextMonthEpoch() };
      }
      return data;
    }
  } catch { /* use defaults */ }
  return { exportsThisMonth: 0, resetEpoch: nextMonthEpoch() };
}

function saveQuota(state: QuotaState): void {
  const dir = join(homedir(), '.claude-mem');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(QUOTA_FILE, JSON.stringify(state), 'utf-8');
}

function nextMonthEpoch(): number {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export class ProspectingService {
  constructor(private db: Database) {}

  async findNewProspects(strategy: BusinessStrategy, limit = 10): Promise<number> {
    const quota = loadQuota();
    if (quota.exportsThisMonth >= MONTHLY_EXPORT_LIMIT) {
      logger.warn('BUSINESS', `Apollo export quota reached (${quota.exportsThisMonth}/${MONTHLY_EXPORT_LIMIT}), skipping prospecting`);
      return 0;
    }

    const remaining = MONTHLY_EXPORT_LIMIT - quota.exportsThisMonth;
    const searchLimit = Math.min(limit, remaining);

    const titles = strategy.target_title.split(',').map(t => t.trim()).filter(Boolean);
    const titlesJson = JSON.stringify(titles);

    const prompt = `Use the Apollo.io search tool to find ${searchLimit} B2B contacts matching this profile:
- Job titles: ${titles.join(', ')}
- Company size: ${strategy.target_company_size_min} to ${strategy.target_company_size_max} employees
- Industry: software, saas, technology

Call the apollo_mixed_people_api_search tool with these parameters:
- person_titles: ${titlesJson}
- organization_num_employees_ranges: ["${strategy.target_company_size_min},${strategy.target_company_size_max}"]
- q_organization_industries: ["software", "saas", "technology", "internet"]
- per_page: ${searchLimit}

After searching, respond with ONLY a JSON array of contacts (no markdown):
[
  {
    "apollo_id": "string or null",
    "first_name": "string",
    "last_name": "string",
    "email": "string or null",
    "title": "string",
    "company": "string",
    "company_domain": "string or null",
    "employee_count": number or null,
    "industry": "string or null",
    "linkedin_url": "string or null"
  }
]

Return only real contacts from Apollo. If Apollo returns no results, return an empty array [].`;

    let newCount = 0;
    try {
      const response = await runBusinessAgent(prompt, 90_000);
      const contacts = this.parseContactsJson(response);

      const now = Date.now();
      for (const contact of contacts) {
        const inserted = this.insertProspect(contact, now);
        if (inserted) newCount++;
      }

      quota.exportsThisMonth += contacts.length;
      saveQuota(quota);

      logger.info('BUSINESS', `Prospecting: found ${contacts.length} contacts, inserted ${newCount} new`, {
        quota: quota.exportsThisMonth,
      });
    } catch (error) {
      logger.error('BUSINESS', 'Prospecting failed', {}, error as Error);
    }

    return newCount;
  }

  qualifyProspects(strategy: BusinessStrategy): number {
    const now = Date.now();
    const result = this.db.prepare(`
      UPDATE prospects
      SET stage = 'qualified', updated_at_epoch = ?
      WHERE stage = 'found'
        AND email IS NOT NULL
        AND (employee_count IS NULL
          OR (employee_count >= ? AND employee_count <= ?))
    `).run(now, strategy.target_company_size_min, strategy.target_company_size_max);
    return result.changes;
  }

  getProspectsByStage(stage: string, limit = 100): Prospect[] {
    return this.db.prepare(
      'SELECT * FROM prospects WHERE stage = ? ORDER BY created_at_epoch DESC LIMIT ?'
    ).all(stage, limit) as Prospect[];
  }

  getProspect(id: number): Prospect | null {
    return this.db.prepare('SELECT * FROM prospects WHERE id = ?').get(id) as Prospect | null;
  }

  updateProspectStage(id: number, stage: string, extra?: Partial<Prospect>): void {
    const now = Date.now();
    let sql = 'UPDATE prospects SET stage = ?, updated_at_epoch = ?';
    const values: unknown[] = [stage, now];
    if (extra?.last_contacted_epoch !== undefined) {
      sql += ', last_contacted_epoch = ?';
      values.push(extra.last_contacted_epoch);
    }
    if (extra?.follow_up_count !== undefined) {
      sql += ', follow_up_count = ?';
      values.push(extra.follow_up_count);
    }
    if (extra?.notes !== undefined) {
      sql += ', notes = ?';
      values.push(extra.notes);
    }
    sql += ' WHERE id = ?';
    values.push(id);
    this.db.prepare(sql).run(...values);
  }

  private insertProspect(contact: any, now: number): boolean {
    if (contact.apollo_id) {
      const exists = this.db.prepare('SELECT id FROM prospects WHERE apollo_id = ?').get(contact.apollo_id);
      if (exists) return false;
    }
    if (contact.email) {
      const exists = this.db.prepare('SELECT id FROM prospects WHERE email = ?').get(contact.email);
      if (exists) return false;
    }

    this.db.prepare(`
      INSERT INTO prospects
        (apollo_id, first_name, last_name, email, title, company, company_domain,
         employee_count, industry, linkedin_url, stage, found_at_epoch, follow_up_count,
         created_at_epoch, updated_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'found', ?, 0, ?, ?)
    `).run(
      contact.apollo_id ?? null,
      contact.first_name ?? '',
      contact.last_name ?? '',
      contact.email ?? null,
      contact.title ?? '',
      contact.company ?? '',
      contact.company_domain ?? null,
      contact.employee_count ?? null,
      contact.industry ?? null,
      contact.linkedin_url ?? null,
      now, now, now
    );
    return true;
  }

  private parseContactsJson(response: string): any[] {
    const match = response.match(/\[[\s\S]*\]/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
