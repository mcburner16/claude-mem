import type { MaintenanceRequest, RequestStatus } from './types';
import { DEMO_REQUESTS } from './demoData';

const STORAGE_KEY = 'triageflow_requests';

export function getRequests(): MaintenanceRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEMO_REQUESTS];
    const parsed = JSON.parse(raw) as MaintenanceRequest[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEMO_REQUESTS];
    return parsed;
  } catch {
    return [...DEMO_REQUESTS];
  }
}

export function saveRequests(requests: MaintenanceRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function addRequest(req: MaintenanceRequest): void {
  const requests = getRequests();
  requests.unshift(req);
  saveRequests(requests);
}

export function updateRequestStatus(id: string, status: RequestStatus): void {
  const requests = getRequests();
  const idx = requests.findIndex((r) => r.id === id);
  if (idx !== -1) {
    requests[idx] = { ...requests[idx], status };
    saveRequests(requests);
  }
}

export function resetToDemo(): void {
  localStorage.removeItem(STORAGE_KEY);
}
