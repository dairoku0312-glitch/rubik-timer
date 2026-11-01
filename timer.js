export function formatTime(ms) {
  const centiseconds = Math.floor(ms / 10);
  const seconds = Math.floor(centiseconds / 100);
  return `${seconds >= 60 ? `${Math.floor(seconds / 60)}:` : ''}${seconds >= 60 ? String(seconds % 60).padStart(2, '0') : seconds}.${String(centiseconds % 100).padStart(2, '0')}`;
}

export function ao5(records) {
  if (records.length < 5) return null;
  const times = records.slice(0, 5).map(r => r.ms).sort((a, b) => a - b);
  return (times[1] + times[2] + times[3]) / 3;
}
