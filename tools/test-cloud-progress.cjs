require('./ts-loader.cjs');
const assert = require('assert');
const {
  canClaimAdReward,
  emptyAdRewards,
  markAdReward,
  mergeProgress,
  normalizeProgress,
} = require('../assets/scripts/core/CloudProgress.ts');

const a = normalizeProgress({ completed: 10, index: 10, wins: { 0: true }, sound: true, updatedAt: 100 });
const b = normalizeProgress({ completed: 100, index: 100, wins: { 99: true }, sound: false, updatedAt: 200 });
const merged = mergeProgress(a, b);
assert.equal(merged.completed, 100);
assert.equal(merged.index, 100);
assert.equal(merged.sound, false);
assert(merged.wins[0]);
assert(merged.wins[99]);

let progress = normalizeProgress({ completed: 10, adRewards: emptyAdRewards() });
assert(canClaimAdReward(progress, 'level-a'));
progress = markAdReward(progress, 'level-a');
assert.equal(progress.adRewards.dailyCount, 1);
assert.equal(progress.adRewards.levelRewardCount['level-a'], 1);
assert(!canClaimAdReward(progress, 'level-a'), 'one level can claim once');
assert(canClaimAdReward(progress, 'level-b'), 'another level can still claim while daily quota remains');

let capped = normalizeProgress({ adRewards: { date: new Date().toISOString().slice(0, 10), dailyCount: 5, levelRewardCount: {} } });
assert(!canClaimAdReward(capped, 'level-c'), 'daily quota caps rewards');

console.log('PASS cloud progress: user progress merge and rewarded ad quota.');
