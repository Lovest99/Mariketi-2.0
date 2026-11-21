import type { OfflineInspectionDraft } from '../types/mariketi';

const DB_NAME = 'mariketi_field_ops_db';
const DB_VERSION = 1;
const STORE_DRAFTS = 'inspection_drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable in this browser environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'taskId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineDraft(draft: OfflineInspectionDraft): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      tx.objectStore(STORE_DRAFTS).put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback to localStorage if IndexedDB is restricted
    const existing = loadFallbackDrafts();
    const updated = [...existing.filter((d) => d.taskId !== draft.taskId), draft];
    localStorage.setItem('mariketi_offline_drafts_fallback', JSON.stringify(updated));
  }
}

export async function getAllOfflineDrafts(): Promise<OfflineInspectionDraft[]> {
  try {
    const db = await openDb();
    const results = await new Promise<OfflineInspectionDraft[]>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readonly');
      const req = tx.objectStore(STORE_DRAFTS).getAll();
      req.onsuccess = () => resolve((req.result as OfflineInspectionDraft[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return results;
  } catch {
    return loadFallbackDrafts();
  }
}

export async function deleteOfflineDraft(taskId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, 'readwrite');
      tx.objectStore(STORE_DRAFTS).delete(taskId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const existing = loadFallbackDrafts().filter((d) => d.taskId !== taskId);
    localStorage.setItem('mariketi_offline_drafts_fallback', JSON.stringify(existing));
  }
}

function loadFallbackDrafts(): OfflineInspectionDraft[] {
  try {
    const raw = localStorage.getItem('mariketi_offline_drafts_fallback');
    return raw ? (JSON.parse(raw) as OfflineInspectionDraft[]) : [];
  } catch {
    return [];
  }
}
