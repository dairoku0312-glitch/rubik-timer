import { ao5, formatTime } from './timer.js';
const $ = id => document.getElementById(id);
const key = 'cube-timer.records.v1';
let records = [], running = false, started = 0, frame, storageOK = true;
try {
  const stored = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(stored)) records = stored.filter(r => r && typeof r.id === 'string' && Number.isFinite(r.ms) && r.ms >= 0 && Number.isFinite(r.date));
} catch { storageOK = false; }

// --- Calendar state ---
// Dates are handled as local 'YYYY-MM-DD' keys so a solve is filed under the
// day it happened in the user's own timezone.
const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keyToDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const today = new Date();
let selected = dateKey(today);
let viewYear = today.getFullYear(), viewMonth = today.getMonth();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const recordDays = () => new Set(records.map(r => dateKey(new Date(r.date))));
const dayRecords = () => records.filter(r => dateKey(new Date(r.date)) === selected);

function save() {
  try { localStorage.setItem(key, JSON.stringify(records)); storageOK = true; }
  catch { storageOK = false; }
  render();
}
function display(ms) {
  const [whole, decimal] = formatTime(ms).split('.');
  $('time').replaceChildren(document.createTextNode(whole), Object.assign(document.createElement('span'), {textContent: `.${decimal}`}));
}
function renderCalendar() {
  const days = recordDays();
  $('cal-title').innerHTML = `${MONTHS[viewMonth]} <span>${viewYear}</span>`;
  const first = new Date(viewYear, viewMonth, 1);
  const start = new Date(viewYear, viewMonth, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const k = dateKey(d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day'
      + (d.getMonth() !== viewMonth ? ' dim' : '')
      + (days.has(k) ? ' has-records' : '')
      + (k === dateKey(new Date()) ? ' today' : '')
      + (k === selected ? ' selected' : '');
    btn.textContent = d.getDate();
    btn.setAttribute('aria-label', `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${days.has(k) ? '（記録あり）' : ''}`);
    btn.addEventListener('click', () => { selected = k; viewYear = d.getFullYear(); viewMonth = d.getMonth(); render(); });
    cells.push(btn);
  }
  $('cal-grid').replaceChildren(...cells);
  const monthPrefix = `${viewYear}-${pad(viewMonth + 1)}-`;
  $('cal-month-days').textContent = [...days].filter(k => k.startsWith(monthPrefix)).length;
  $('cal-total-days').textContent = `${days.size} days`;
}
function render() {
  const average = ao5(records);
  $('average').textContent = average === null ? '—' : formatTime(average);
  $('average-note').textContent = average === null ? `あと${5 - records.length}回で表示` : '最速・最遅を除いた平均';
  $('best').textContent = records.length ? formatTime(records.reduce((best, r) => Math.min(best, r.ms), Infinity)) : '—';
  $('count').innerHTML = `${records.length}<em>回</em>`;
  $('clear').disabled = !records.length || running;
  $('storage-note').textContent = storageOK ? '記録はこのブラウザに自動保存されます。' : '保存できませんでした。記録は画面を閉じると失われる場合があります。';
  renderCalendar();
  const day = dayRecords();
  const sel = keyToDate(selected);
  $('day-title').textContent = sel.toLocaleDateString('ja-JP', {year:'numeric', month:'long', day:'numeric', weekday:'short'});
  const dayAverage = ao5(day);
  $('day-stats').textContent = day.length
    ? `${day.length}回 ・ ベスト ${formatTime(day.reduce((b, r) => Math.min(b, r.ms), Infinity))} ・ Ao5 ${dayAverage === null ? '—' : formatTime(dayAverage)}`
    : '記録なし';
  $('history-count').textContent = day.length;
  $('empty').hidden = day.length > 0;
  $('empty-title').textContent = records.length ? 'この日の記録はありません' : '最初の記録をつくろう';
  $('empty-text').textContent = records.length ? 'カレンダーで記録のある日を選ぶと、ここに表示されます。' : 'タイマーをタップすると、ここに記録が残ります。';
  $('records').replaceChildren(...day.map((r, index) => {
    const li = document.createElement('li');
    const info = document.createElement('span'); info.className = 'record-info';
    const number = document.createElement('b'); number.textContent = String(day.length - index).padStart(2, '0');
    const date = document.createElement('small'); date.textContent = new Date(r.date).toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'});
    info.append(number, date);
    const time = document.createElement('span'); time.className = 'record-time'; time.textContent = formatTime(r.ms);
    const remove = document.createElement('button'); remove.className = 'delete'; remove.textContent = '×'; remove.type = 'button'; remove.disabled = running; remove.setAttribute('aria-label', `記録${day.length - index}を削除`);
    remove.addEventListener('click', () => { records = records.filter(item => item.id !== r.id); save(); });
    li.append(info, time, remove); return li;
  }));
}
function tick() { display(performance.now() - started); frame = requestAnimationFrame(tick); }
function toggle() {
  if (running) {
    const ms = performance.now() - started;
    cancelAnimationFrame(frame); running = false;
    records.unshift({id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ms, date: Date.now()});
    const now = new Date();
    selected = dateKey(now); viewYear = now.getFullYear(); viewMonth = now.getMonth();
    display(ms); save();
    $('status').innerHTML = '<i></i> SOLVE COMPLETE';
    $('hint').textContent = 'タップして次の計測へ';
    $('announcement').textContent = `${formatTime(ms)}秒。記録しました。`;
  } else {
    running = true; started = performance.now(); tick(); render();
    $('status').innerHTML = '<i></i> SOLVING';
    $('hint').textContent = 'タップしてストップ';
    $('announcement').textContent = '計測を開始しました。';
  }
  document.body.classList.toggle('running', running);
  $('timer').setAttribute('aria-label', running ? 'タップして計測停止' : 'タップして計測開始');
}
// Pointer-down stops immediately; suppress the subsequent synthesized click on iOS.
$('timer').addEventListener('pointerdown', event => { if (!event.isPrimary || event.button !== 0) return; event.preventDefault(); toggle(); });
$('timer').addEventListener('click', event => { if (event.detail === 0) toggle(); });
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest('button, a, input, textarea, select') && event.target !== $('timer')) return;
  event.preventDefault(); toggle();
});
$('clear').addEventListener('click', () => { if (confirm('すべての記録を削除しますか？ この操作は取り消せません。')) { records = []; save(); display(0); } });
$('cal-prev').addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
$('cal-next').addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });
render();
