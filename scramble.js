// 3x3x3 スクランブル生成（ランダムムーブ方式）
// WCA公式はランダムステート方式だが、ここでは多くのタイマーアプリの
// ランダム生成と同様に「制約付きランダムムーブ」で生成する：
// - 同じ面を連続で回さない
// - 同じ軸の面に挟まれた同じ面の繰り返し（例: R L R）を避ける
// これにより、潰れて実質的に短くなる手順を避けている。
const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const AXIS = { U: 0, D: 0, L: 1, R: 1, F: 2, B: 2 };
const MODIFIERS = ['', "'", '2'];
export const SCRAMBLE_LENGTH = 21;

export function generateScramble(rng = Math.random, length = SCRAMBLE_LENGTH) {
  const moves = [];
  while (moves.length < length) {
    const face = FACES[Math.floor(rng() * FACES.length)];
    const prev = moves[moves.length - 1];
    const prev2 = moves[moves.length - 2];
    if (prev && face === prev.face) continue;
    if (prev && prev2 && face === prev2.face && AXIS[face] === AXIS[prev.face]) continue;
    moves.push({ face, mod: MODIFIERS[Math.floor(rng() * MODIFIERS.length)] });
  }
  return moves.map(m => m.face + m.mod).join(' ');
}

const TOKEN = /^[UDLRFB](?:'|2)?$/;

export function scrambleMoves(scramble) {
  return String(scramble).trim().split(/\s+/).filter(Boolean);
}

export function isValidScramble(scramble, length = SCRAMBLE_LENGTH) {
  const tokens = scrambleMoves(scramble);
  if (tokens.length !== length) return false;
  const faces = tokens.map(t => t[0]);
  for (let i = 0; i < tokens.length; i++) {
    if (!TOKEN.test(tokens[i])) return false;
    if (i >= 1 && faces[i] === faces[i - 1]) return false;
    if (i >= 2 && faces[i] === faces[i - 2] && AXIS[faces[i]] === AXIS[faces[i - 1]]) return false;
  }
  return true;
}
