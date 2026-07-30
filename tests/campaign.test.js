import test from "node:test";
import assert from "node:assert/strict";

import {
  OPPONENTS,
  getWinProgress,
  normalizeLevel,
} from "../public/js/campaign.js";

test("campaign contains the five opponents in order", () => {
  assert.deepEqual(
    OPPONENTS.map(({ name }) => name),
    ["Kim", "刀龙", "tuch", "peach", "阿福"],
  );
  assert.equal(OPPONENTS.every(({ skill }) => skill > 0 && skill <= 1), true);
});

test("campaign advances through four stages and stops at the final stage", () => {
  assert.deepEqual(getWinProgress(0), { isFinal: false, nextLevel: 1 });
  assert.deepEqual(getWinProgress(3), { isFinal: false, nextLevel: 4 });
  assert.deepEqual(getWinProgress(4), { isFinal: true, nextLevel: 4 });
});

test("saved levels are normalized to the valid campaign range", () => {
  assert.equal(normalizeLevel(-3), 0);
  assert.equal(normalizeLevel("2"), 2);
  assert.equal(normalizeLevel(99), 4);
  assert.equal(normalizeLevel("bad"), 0);
});
