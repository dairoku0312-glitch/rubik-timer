// 長押し＋インスペクションの状態遷移（DOM非依存・テスト可能）
// 状態: idle → holding → inspection → running
// - press: 待機中に押し始める
// - tick: 時間経過による遷移（長押し成立→インスペクション、15秒経過→自動スタート）
// - release: インスペクション中に離すと計測開始。計測中の release は何もしない
//   （自動スタート後に指を離しても止まらない）
export const HOLD_MS = 500;
export const INSPECTION_MS = 15000;

export class InspectionTimer {
  constructor() {
    this.state = 'idle';
    this.pressAt = 0;
    this.inspectionEndsAt = 0;
    this.startedAt = 0;
    this.autoStarted = false;
  }

  press(now) {
    if (this.state !== 'idle') return null;
    this.state = 'holding';
    this.pressAt = now;
    return 'holding';
  }

  tick(now) {
    if (this.state === 'holding' && now - this.pressAt >= HOLD_MS) {
      this.state = 'inspection';
      this.inspectionEndsAt = now + INSPECTION_MS;
      return 'inspection-start';
    }
    if (this.state === 'inspection' && now >= this.inspectionEndsAt) {
      this.state = 'running';
      this.startedAt = this.inspectionEndsAt; // 15秒ちょうどの時刻を起点にする
      this.autoStarted = true;
      return 'auto-start';
    }
    return null;
  }

  release(now) {
    if (this.state === 'holding') {
      this.state = 'idle';
      return 'hold-cancelled'; // 0.5秒未満: 何も起こらない
    }
    if (this.state === 'inspection') {
      this.state = 'running';
      this.startedAt = now;
      this.autoStarted = false;
      return 'solve-start';
    }
    return null; // running 中の release は無視（自動スタート後の指離し対策）
  }

  cancel() {
    if (this.state === 'holding' || this.state === 'inspection') {
      this.state = 'idle';
      return true;
    }
    return false;
  }

  finish() {
    this.state = 'idle';
    this.autoStarted = false;
  }

  inspectionRemainingMs(now) {
    if (this.state !== 'inspection') return 0;
    return Math.max(0, this.inspectionEndsAt - now);
  }
}
