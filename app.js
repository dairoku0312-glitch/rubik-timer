import { ao5, formatTime } from './timer.js';
import { generateScramble } from './scramble.js?v=20261123-1';
import { InspectionTimer } from './inspection.js?v=20261126-1';
import { keyForMode, loadRecords, saveRecords, loadMode, saveMode } from './recordStore.js?v=20261123-3';
const $ = id => document.getElementById(id);
// 通常ソルブは従来キー（移行なし）、クロス練習は別キーで完全分離
let mode = loadMode(localStorage);
const store = {
  solve: loadRecords(localStorage, keyForMode('solve')),
  cross: loadRecords(localStorage, keyForMode('cross')),
};
let records = store[mode];
let running = false, started = 0, frame, phaseFrame, storageOK = true;
const machine = new InspectionTimer();
try { localStorage.getItem(keyForMode('solve')); } catch { storageOK = false; }

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
  store[mode] = records;
  storageOK = saveRecords(localStorage, keyForMode(mode), records);
  render();
}

// --- 練習モード切り替え（計測中・インスペクション中は切り替え不可） ---
function applyMode() {
  $('mode-solve').classList.toggle('active', mode === 'solve');
  $('mode-cross').classList.toggle('active', mode === 'cross');
  $('mode-solve').setAttribute('aria-pressed', String(mode === 'solve'));
  $('mode-cross').setAttribute('aria-pressed', String(mode === 'cross'));
}
function setMode(next) {
  if (next === mode || machine.state !== 'idle') return;
  mode = next;
  records = store[mode];
  saveMode(localStorage, mode);
  applyMode();
  render();
  $('announcement').textContent = next === 'cross' ? 'クロス練習モードに切り替えました。' : '通常ソルブモードに切り替えました。';
}
$('mode-solve').addEventListener('click', () => setMode('solve'));
$('mode-cross').addEventListener('click', () => setMode('cross'));
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

// --- Scramble ---
const scrambleKey = 'cube-timer.scramble.v1';
let scrambleOn = true;
try { scrambleOn = localStorage.getItem(scrambleKey) !== 'off'; } catch { /* 読めない場合はON */ }
function newScramble() { $('scramble').textContent = generateScramble(); }
function applyScramble() {
  $('scramble-box').hidden = !scrambleOn;
  $('scramble-toggle').checked = scrambleOn;
}
$('scramble-toggle').addEventListener('change', () => {
  scrambleOn = $('scramble-toggle').checked;
  try { localStorage.setItem(scrambleKey, scrambleOn ? 'on' : 'off'); } catch { /* 保存不可でも切替は有効 */ }
  applyScramble();
});
$('scramble-next').addEventListener('click', () => { newScramble(); });

// --- 長押し＋インスペクション（状態遷移は inspection.js） ---
function setPhaseUI() {
  const s = machine.state;
  document.body.classList.toggle('holding', s === 'holding');
  document.body.classList.toggle('inspecting', s === 'inspection');
  document.body.classList.toggle('running', s === 'running');
  $('cancel-inspection').hidden = s !== 'inspection';
  $('timer').setAttribute('aria-label', s === 'running' ? 'タップして計測停止' : '長押しで計測準備');
  const modeLocked = s !== 'idle';
  $('mode-solve').disabled = modeLocked;
  $('mode-cross').disabled = modeLocked;
}
function resetIdleUI(status, hint) {
  running = false; setPhaseUI();
  $('status').innerHTML = `<i></i> ${status}`;
  $('hint').textContent = hint;
}
function phaseTick() {
  const now = performance.now();
  const event = machine.tick(now);
  if (event === 'inspection-start') {
    $('status').innerHTML = '<i></i> INSPECTION';
    $('hint').textContent = 'タップでスタート（15秒経つと自動スタート）';
    $('announcement').textContent = 'インスペクション開始。タップで計測が始まり、15秒経過すると自動で始まります。';
    setPhaseUI();
  }
  if (machine.state === 'inspection') {
    $('time').textContent = Math.ceil(machine.inspectionRemainingMs(now) / 1000);
  }
  if (event === 'auto-start') { beginSolve(); return; }
  if (machine.state === 'holding' || machine.state === 'inspection') {
    phaseFrame = requestAnimationFrame(phaseTick);
  }
}
function ensurePhaseLoop() { cancelAnimationFrame(phaseFrame); phaseFrame = requestAnimationFrame(phaseTick); }
function beginSolve() {
  running = true; started = machine.startedAt;
  cancelAnimationFrame(phaseFrame);
  tick(); render(); setPhaseUI();
  $('status').innerHTML = '<i></i> SOLVING';
  $('hint').textContent = 'タップしてストップ';
  $('announcement').textContent = '計測を開始しました。';
}
function pressStart() {
  if (machine.state === 'running') {
    // 開始直後（300ms以内）の誤タップでは止めない
    if (performance.now() - machine.startedAt < 300) return;
    stopSolve(); return;
  }
  const event = machine.press(performance.now());
  if (event === 'solve-start') { beginSolve(); return; }
  if (event === 'holding') {
    $('status').innerHTML = '<i></i> KEEP HOLDING';
    $('hint').textContent = 'そのまま1秒長押し…';
    setPhaseUI(); ensurePhaseLoop();
  }
}
function pressEnd() {
  const event = machine.release(performance.now());
  if (event === 'solve-start') beginSolve();
  else if (event === 'hold-cancelled') resetIdleUI('READY TO SOLVE', '長押しでスタート準備');
}
function cancelInspection() {
  if (!machine.cancel()) return;
  cancelAnimationFrame(phaseFrame);
  display(0);
  resetIdleUI('READY TO SOLVE', '長押しでスタート準備');
  $('announcement').textContent = 'キャンセルしました。';
}
function stopSolve() {
  const ms = performance.now() - started;
  cancelAnimationFrame(frame); running = false; machine.finish();
  records.unshift({id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ms, date: Date.now()});
  const now = new Date();
  selected = dateKey(now); viewYear = now.getFullYear(); viewMonth = now.getMonth();
  display(ms); save();
  newScramble();
  resetIdleUI('SOLVE COMPLETE', '長押しで次の計測へ');
  $('announcement').textContent = `${formatTime(ms)}秒。記録しました。`;
}
$('timer').addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (!event.isPrimary) {
    // インスペクション中の別の指のタップも「再度タップ」として開始する
    if (machine.state === 'inspection') { event.preventDefault(); pressStart(); }
    return;
  }
  event.preventDefault();
  pressStart();
});
$('timer').addEventListener('pointerup', event => { if (event.isPrimary) pressEnd(); });
$('timer').addEventListener('pointercancel', () => { cancelInspection(); });
$('timer').addEventListener('contextmenu', event => event.preventDefault());
$('cancel-inspection').addEventListener('click', () => cancelInspection());
document.addEventListener('keydown', event => {
  if (event.code === 'Escape') { cancelInspection(); return; }
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest('button, a, input, textarea, select') && event.target !== $('timer')) return;
  event.preventDefault();
  if (machine.state === 'running') {
    if (performance.now() - machine.startedAt >= 300) stopSolve();
    return;
  }
  pressStart();
});
document.addEventListener('keyup', event => {
  if (event.code !== 'Space') return;
  if (event.target.closest('button, a, input, textarea, select') && event.target !== $('timer')) return;
  event.preventDefault();
  pressEnd();
});
$('clear').addEventListener('click', () => { if (confirm('すべての記録を削除しますか？ この操作は取り消せません。')) { records = []; save(); display(0); } });
$('cal-prev').addEventListener('click', () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(); });
$('cal-next').addEventListener('click', () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(); });
newScramble();
applyScramble();
applyMode();
render();
