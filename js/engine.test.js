const E = require("./engine.js");
const assert = require("node:assert/strict");

function almost(a, b, epsilon = 1e-9, label = "") {
  if (Math.abs(a - b) > epsilon) {
    throw new Error(`${label}: ${a} !== ${b} (diff ${a - b})`);
  }
}

function total(dist) {
  return [...dist.values()].reduce((a, b) => a + b, 0);
}

function distributionFor(values) {
  const map = new Map();
  for (const value of values) map.set(value, (map.get(value) || 0) + 1 / values.length);
  return map;
}

function* cartesian(groups) {
  if (!groups.length) {
    yield [];
    return;
  }
  const [first, ...rest] = groups;
  for (const value of first) {
    for (const tail of cartesian(rest)) yield [value, ...tail];
  }
}

function bruteKeep(n, sides, mode, keep) {
  const outcomes = new Map();
  const values = Array.from({ length: sides }, (_, i) => i + 1);
  const groups = Array.from({ length: n }, () => values);
  for (const roll of cartesian(groups)) {
    const sorted = [...roll].sort((a, b) => (mode === "low" ? a - b : b - a));
    const sum = sorted.slice(0, keep).reduce((a, b) => a + b, 0);
    outcomes.set(sum, (outcomes.get(sum) || 0) + 1);
  }
  const totalRolls = Math.pow(sides, n);
  const map = new Map();
  for (const [value, count] of outcomes) map.set(value, count / totalRolls);
  return map;
}

function compareDistributions(a, b, label) {
  almost(total(a), 1, 1e-10, `${label} total A`);
  almost(total(b), 1, 1e-10, `${label} total B`);
  const values = new Set([...a.keys(), ...b.keys()]);
  for (const value of values) {
    almost(a.get(value) || 0, b.get(value) || 0, 1e-10, `${label} @${value}`);
  }
}

// Somas basicas
const twoD6 = E.computeSum({
  primary: { count: 2, sides: 6 },
  extras: [],
  keep: { mode: "all", count: 2 },
  bonus: 0,
});
compareDistributions(twoD6, distributionFor([2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 12]), "2d6");

// Keep
for (const mode of ["high", "low"]) {
  for (const keep of [1, 2, 3]) {
    const actual = E.groupDistribution(4, 6, { keepMode: mode, keepCount: keep });
    const expected = bruteKeep(4, 6, mode, keep);
    compareDistributions(actual, expected, `4d6 ${mode} ${keep}`);
  }
}

// Explosao: comparar com enumeracao limitada (1d6, profundidade suficiente)
function bruteExplodeSingle(sides, target, maxDepth) {
  let outcomes = new Map();
  function walk(total, successes, depth, probability) {
    for (let face = 1; face <= sides; face += 1) {
      const p = probability / sides;
      const nextTotal = total + face;
      const nextSuccesses = successes + (face >= target ? 1 : 0);
      if (face === sides && depth + 1 < maxDepth) {
        walk(nextTotal, nextSuccesses, depth + 1, p);
      } else {
        outcomes.set(nextTotal, (outcomes.get(nextTotal) || 0) + p);
      }
    }
  }
  walk(0, 0, 0, 1);
  return outcomes;
}
const explodeDie = E.baseDie(6, true);
const bruteExplode = bruteExplodeSingle(6, 1, 16);
compareDistributions(explodeDie, bruteExplode, "1d6 explosivo");

// Keep com explosao: 3d6, manter 2 maiores
const keepExplode = E.groupDistribution(3, 6, {
  explode: true,
  keepMode: "high",
  keepCount: 2,
});
almost(total(keepExplode), 1, 1e-9, "keep explode total");

// Sucessos: 3d4, alvo 3, sem explosao
const successes = E.computeSuccess({
  primary: { count: 3, sides: 4 },
  extras: [],
  successTarget: 3,
  explode: false,
  bonus: 0,
});
const expectedSuccesses = new Map([
  [0, 8 / 64],
  [1, 24 / 64],
  [2, 24 / 64],
  [3, 8 / 64],
]);
compareDistributions(successes, expectedSuccesses, "3d4 alvo 3");

// Sucessos com explosao: total deve ser 1 e media plausivel
const explodingSuccesses = E.computeSuccess({
  primary: { count: 5, sides: 10 },
  extras: [],
  successTarget: 8,
  explode: true,
  bonus: 0,
});
almost(total(explodingSuccesses), 1, 1e-9, "success total");
const successStats = E.analyze(explodingSuccesses);
almost(successStats.mean, 5 * 0.3 / 0.9, 1e-6, "success mean");

// Duelo
const a = E.computeSum({
  primary: { count: 1, sides: 20 },
  extras: [],
  keep: { mode: "all", count: 1 },
  bonus: 5,
});
const b = E.computeSum({
  primary: { count: 1, sides: 20 },
  extras: [],
  keep: { mode: "all", count: 1 },
  bonus: 3,
});
const duel = E.compareDistributions(a, b);
almost(duel.winFirst + duel.tie + duel.winSecond, 1, 1e-9, "duel total");
almost(duel.winFirst, 0.5725, 1e-9, "duel winFirst");
almost(duel.tie, 0.045, 1e-9, "duel tie");

// Bonus e dados extras
const withExtra = E.computeSum({
  primary: { count: 1, sides: 6 },
  extras: [{ count: 1, sides: 4 }],
  keep: { mode: "all", count: 1 },
  bonus: 2,
});
almost(E.analyze(withExtra).mean, 3.5 + 2.5 + 2, 1e-9, "extra mean");

// Maior de 5d20 (vantagem extrema)
const max5 = E.groupDistribution(5, 20, { keepMode: "high", keepCount: 1 });
const max5Stats = E.analyze(max5);
almost(max5Stats.mean, 17.14584375, 1e-9, "max 5d20 mean");

// Simulacao nao deve quebrar
for (let i = 0; i < 20; i += 1) {
  const roll = E.rollSum({
    primary: { count: 4, sides: 6 },
    extras: [{ count: 1, sides: 8 }],
    keep: { mode: "high", count: 3 },
    explode: false,
    bonus: 2,
  });
  assert.ok(Number.isFinite(roll.total));
  assert.equal(roll.primaryDice.filter((die) => die.kept).length, 3);
}
for (let i = 0; i < 20; i += 1) {
  const roll = E.rollSuccess({
    primary: { count: 5, sides: 10 },
    extras: [],
    successTarget: 8,
    explode: true,
    bonus: 1,
  });
  assert.ok(Number.isFinite(roll.total));
}

console.log("OK — todos os testes do motor passaram.");
