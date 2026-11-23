// モード別の記録ストレージ
// 重要（既存データ保護）: 通常ソルブは従来キー 'cube-timer.records.v1' を
// そのまま使う。移行処理は一切せず、既存記録は自動的に通常ソルブ扱いになる。
// クロス練習は新しいキーに分離し、通常ソルブのデータには一切触れない。
export const SOLVE_KEY = 'cube-timer.records.v1';
export const CROSS_KEY = 'cube-timer.records.cross.v1';
export const MODE_KEY = 'cube-timer.mode.v1';

export function keyForMode(mode) {
  return mode === 'cross' ? CROSS_KEY : SOLVE_KEY;
}

export function sanitizeRecords(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(r => r && typeof r.id === 'string'
    && Number.isFinite(r.ms) && r.ms >= 0 && Number.isFinite(r.date));
}

export function loadRecords(storage, key) {
  try {
    return sanitizeRecords(JSON.parse(storage.getItem(key) || '[]'));
  } catch {
    return [];
  }
}

export function saveRecords(storage, key, records) {
  try {
    storage.setItem(key, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function loadMode(storage) {
  try {
    return storage.getItem(MODE_KEY) === 'cross' ? 'cross' : 'solve';
  } catch {
    return 'solve';
  }
}

export function saveMode(storage, mode) {
  try {
    storage.setItem(MODE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}
