import { ao5, formatTime } from './timer.js';
const $ = id => document.getElementById(id);
const key = 'cube-timer.records.v1';
let records = [], running = false, started = 0, frame, storageOK = true;
try {
  const stored = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(stored)) records = stored.filter(r => r && typeof r.id === 'string' && Number.isFinite(r.ms) && r.ms >= 0 && Number.isFinite(r.date));
} catch { storageOK = false; }
function save() {
  try { localStorage.setItem(key, JSON.stringify(records)); storageOK = true; }
  catch { storageOK = false; }
  render();
}
function display(ms) {
  const [whole, decimal] = formatTime(ms).split('.');
  $('time').replaceChildren(document.createTextNode(whole), Object.assign(document.createElement('span'), {textContent: `.${decimal}`}));
}
function render() {
  const average = ao5(records);
  $('average').textContent = average === null ? '—' : formatTime(average);
  $('average-note').textContent = average === null ? `あと${5 - records.length}回で表示` : '最速・最遅を除いた平均';
  $('best').textContent = records.length ? formatTime(records.reduce((best, r) => Math.min(best, r.ms), Infinity)) : '—';
  $('count').innerHTML = `${records.length}<em>回</em>`;
  $('history-count').textContent = records.length;
  $('clear').disabled = !records.length || running;
  $('empty').hidden = records.length > 0;
  $('storage-note').textContent = storageOK ? '記録はこのブラウザに自動保存されます。' : '保存できませんでした。記録は画面を閉じると失われる場合があります。';
  $('records').replaceChildren(...records.map((r, index) => {
    const li = document.createElement('li');
    const info = document.createElement('span'); info.className = 'record-info';
    const number = document.createElement('b'); number.textContent = String(records.length - index).padStart(2, '0');
    const date = document.createElement('small'); date.textContent = new Date(r.date).toLocaleString('ja-JP', {month:'2-digit', day:'2-digit',hour:'2-digit', minute:'2-digit'});
    info.append(number, date);
    const time = document.createElement('span'); time.className = 'record-time'; time.textContent = formatTime(r.ms);
    const remove = document.createElement('button'); remove.className = 'delete'; remove.textContent = '×'; remove.type = 'button'; remove.disabled = running; remove.setAttribute('aria-label', `記録${records.length - index}を削除`);
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
render();
