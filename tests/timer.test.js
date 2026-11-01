import test from 'node:test';
import assert from 'node:assert/strict';
import {ao5, formatTime} from '../timer.js';
test('Ao5 excludes fastest and slowest and uses only latest five', () => {
  assert.equal(ao5([1000,2000,3000,4000,90000,1].map(ms => ({ms}))), 3000);
  assert.equal(ao5([1000,1000,1000,2000,2000].map(ms => ({ms}))), 4000/3);
  assert.equal(ao5([{ms:1}]), null);
});
test('formats centiseconds and minutes without rounding elapsed time up', () => {
  assert.equal(formatTime(0), '0.00');
  assert.equal(formatTime(12999), '12.99');
  assert.equal(formatTime(61020), '1:01.02');
});
