// 長押し＋インスペクションの状態遷移（DOM非依存・テスト可能）
// 状態: idle → holding → inspection → running
// - press: 待機中に押し始める。インスペクション中の press（再度タップ）で計測開始
// - tick: 時間経過による遷移（長押し成立→インスペクション、15秒経過→自動スタート）
// - release: インスペクション中に手を離しても何もしない（カウントダウン継続）。
//   計測中の release も何もしない（自動スタート後に指を離しても止まらない）
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
    if (this.state === 'inspection') {
      // インスペクション中の再度タップで計測開始
      this.state = 'running';
      this.startedAt = now;
      this.autoStarted = false;
      return 'solve-start';
    }
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
    // inspection 中に手を離しても開始しない（開始は再度タップ or 15秒経過）
    // running 中の release も無視（自動スタート後の指離し対策）
    return null;
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
