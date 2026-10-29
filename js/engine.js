/*
 * Dado Aberto — motor de probabilidades
 * Distribuicoes discretas exatas, sem dependencias.
 *
 * Uma distribuicao e um Map<number, probabilidade>.
 * Todos os calculos acontecem localmente, no navegador.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DiceEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPS = 1e-14;
  const MAX_EXPLOSION_DEPTH = 64;
  const MAX_DICE = 40;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const toInt = (value, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  };

  function addTo(map, key, probability) {
    if (probability === 0) return;
    map.set(key, (map.get(key) || 0) + probability);
  }

  function normalize(map) {
    let total = 0;
    for (const probability of map.values()) total += probability;
    if (!total || !Number.isFinite(total)) return new Map();
    if (Math.abs(total - 1) < 1e-12) return map;
    const result = new Map();
    for (const [value, probability] of map) {
      result.set(value, probability / total);
    }
    return result;
  }

  function clean(map) {
    const result = new Map();
    for (const [value, probability] of map) {
      if (probability > EPS) result.set(value, probability);
    }
    return result;
  }

  function shift(map, delta) {
    if (!delta) return new Map(map);
    const result = new Map();
    for (const [value, probability] of map) {
      result.set(value + delta, probability);
    }
    return result;
  }

  function convolve(left, right) {
    const result = new Map();
    for (const [valueA, probabilityA] of left) {
      if (probabilityA <= EPS) continue;
      for (const [valueB, probabilityB] of right) {
        if (probabilityB <= EPS) continue;
        addTo(result, valueA + valueB, probabilityA * probabilityB);
      }
    }
    return result;
  }

  function convolveRepeated(die, count) {
    let result = new Map([[0, 1]]);
    for (let index = 0; index < count; index += 1) {
      result = convolve(result, die);
    }
    return result;
  }

  function flat(value) {
    return new Map([[value, 1]]);
  }

  function sortedEntries(map) {
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }

  function baseDie(sides, explode) {
    sides = clamp(toInt(sides, 6), 2, 1000);
    if (!explode) {
      const probability = 1 / sides;
      const die = new Map();
      for (let face = 1; face <= sides; face += 1) die.set(face, probability);
      return die;
    }

    const die = new Map();
    let chainProbability = 1;
    let offset = 0;

    for (let depth = 0; depth < MAX_EXPLOSION_DEPTH; depth += 1) {
      const faceProbability = chainProbability / sides;
      for (let face = 1; face < sides; face += 1) {
        addTo(die, offset + face, faceProbability);
      }
      chainProbability /= sides;
      offset += sides;
      if (chainProbability < 1e-16) {
        // A cauda restante e menor que a precisao exibida. Colapsamos o
        // encadeamento no valor acumulado para manter a distribuicao normalizada.
        addTo(die, offset, chainProbability);
        break;
      }
    }

    return normalize(die);
  }

  const COMBINATIONS = (() => {
    const table = [];
    for (let n = 0; n <= MAX_DICE; n += 1) {
      const row = new Array(n + 1).fill(0);
      row[0] = 1;
      row[n] = 1;
      for (let k = 1; k < n; k += 1) {
        row[k] = table[n - 1][k - 1] + table[n - 1][k];
      }
      table.push(row);
    }
    return table;
  })();

  function binomialProbability(n, k, p) {
    if (k < 0 || k > n) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    return COMBINATIONS[n][k] * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  function extremeDistribution(count, die, mode) {
    // Caso especial k = 1: maior ou menor de n dados iid.
    const entries = sortedEntries(die);
    const result = new Map();
    let cumulative = 0;

    for (const [value, probability] of entries) {
      const before = cumulative;
      cumulative += probability;
      let probabilityOfExtreme;
      if (mode === "high") {
        probabilityOfExtreme = Math.pow(cumulative, count) - Math.pow(before, count);
      } else {
        probabilityOfExtreme =
          Math.pow(1 - before, count) - Math.pow(1 - cumulative, count);
      }
      if (probabilityOfExtreme > EPS) result.set(value, probabilityOfExtreme);
    }

    return normalize(result);
  }

  function keepDistribution(count, die, mode, keepCount) {
    count = clamp(toInt(count, 1), 1, MAX_DICE);
    keepCount = clamp(toInt(keepCount, 1), 1, count);
    if (mode === "all" || keepCount >= count) return convolveRepeated(die, count);
    if (mode !== "high" && mode !== "low") return convolveRepeated(die, count);
    if (keepCount === 1) return extremeDistribution(count, die, mode);

    const ascending = sortedEntries(die);
    const cumulative = [];
    let running = 0;
    for (const [, probability] of ascending) {
      running += probability;
      cumulative.push(running);
    }

    // "high" percorre do maior para o menor; "low", do menor para o maior.
    const order = [];
    if (mode === "high") {
      for (let index = ascending.length - 1; index >= 0; index -= 1) order.push(index);
    } else {
      for (let index = 0; index < ascending.length; index += 1) order.push(index);
    }

    const maxValue = ascending[ascending.length - 1][0];
    const minValue = ascending[0][0];
    const maxSelectedSum = keepCount * maxValue;
    const strideSum = maxSelectedSum + 1;
    const stateKey = (remaining, kept, sum) =>
      (remaining * (keepCount + 1) + kept) * strideSum + sum;

    let states = new Map([[stateKey(count, 0, 0), 1]]);
    const finished = new Map();

    for (const index of order) {
      const [value, probability] = ascending[index];
      let conditionBase;
      if (mode === "high") {
        conditionBase = cumulative[index];
      } else {
        conditionBase = 1 - (index > 0 ? cumulative[index - 1] : 0);
      }
      const q = probability / conditionBase;
      if (!(q > 0) || !Number.isFinite(q)) continue;

      const nextStates = new Map();
      for (const [key, stateProbability] of states) {
        if (stateProbability <= EPS) continue;
        const projectedSum = key % strideSum;
        const projected = (key - projectedSum) / strideSum;
        const kept = projected % (keepCount + 1);
        const remaining = (projected - kept) / (keepCount + 1);
        const sum = projectedSum;

        for (let sameValue = 0; sameValue <= remaining; sameValue += 1) {
          const probabilityOfCount = binomialProbability(remaining, sameValue, q);
          if (probabilityOfCount <= EPS) continue;
          const pathProbability = stateProbability * probabilityOfCount;
          if (pathProbability <= EPS) continue;

          const needed = keepCount - kept;
          const selected = Math.min(sameValue, needed);
          const newSum = sum + selected * value;
          const newKept = kept + selected;
          const newRemaining = remaining - sameValue;

          if (newKept >= keepCount) {
            addTo(finished, newSum, pathProbability);
          } else if (newRemaining > 0) {
            addTo(
              nextStates,
              stateKey(newRemaining, newKept, newSum),
              pathProbability
            );
          }
        }
      }

      states = nextStates;
      if (!states.size) break;
    }

    // Qualquer estado residual (possivel apenas por truncamento) recebe o valor
    // minimo restante; na pratica o laco acima ja fecha todas as massas.
    if (states.size) {
      for (const [key, stateProbability] of states) {
        if (stateProbability <= EPS) continue;
        const projectedSum = key % strideSum;
        const projected = (key - projectedSum) / strideSum;
        const kept = projected % (keepCount + 1);
        const remaining = (projected - kept) / (keepCount + 1);
        const sum = projectedSum;
        const missing = keepCount - kept;
        const fallbackValue = mode === "high" ? minValue : maxValue;
        addTo(finished, sum + missing * fallbackValue, stateProbability);
        void remaining;
      }
    }

    return normalize(finished);
  }

  function groupDistribution(count, sides, options) {
    const settings = options || {};
    const explode = Boolean(settings.explode);
    const keepMode = settings.keepMode || "all";
    const keepCount = settings.keepCount || count;
    const die = baseDie(sides, explode);
    return keepDistribution(count, die, keepMode, keepCount);
  }

  function computeSum(spec) {
    const primary = spec.primary || { count: 1, sides: 20 };
    const extras = Array.isArray(spec.extras) ? spec.extras : [];
    const keep = spec.keep || { mode: "all", count: primary.count };
    const explode = Boolean(spec.explode);
    const bonus = toInt(spec.bonus, 0);

    let distribution = groupDistribution(primary.count, primary.sides, {
      explode,
      keepMode: keep.mode,
      keepCount: keep.count,
    });

    for (const extra of extras) {
      if (!extra || extra.count <= 0) continue;
      const extraDistribution = groupDistribution(extra.count, extra.sides, {
        explode,
        keepMode: "all",
        keepCount: extra.count,
      });
      distribution = convolve(distribution, extraDistribution);
    }

    return normalize(shift(clean(distribution), bonus));
  }

  function successDie(sides, target, explode) {
    sides = clamp(toInt(sides, 6), 2, 1000);
    target = clamp(toInt(target, sides), -Infinity, Infinity);
    const result = new Map();

    if (!explode) {
      const successChance = clamp((sides - target + 1) / sides, 0, 1);
      result.set(0, 1 - successChance);
      result.set(1, successChance);
      return result;
    }

    let pending = new Map([[0, 1]]);

    for (let depth = 0; depth < MAX_EXPLOSION_DEPTH; depth += 1) {
      const next = new Map();
      for (const [successes, chainProbability] of pending) {
        const faceProbability = chainProbability / sides;
        for (let face = 1; face <= sides; face += 1) {
          const currentSuccesses = successes + (face >= target ? 1 : 0);
          if (face === sides) {
            addTo(next, currentSuccesses, faceProbability);
          } else {
            addTo(result, currentSuccesses, faceProbability);
          }
        }
      }
      pending = next;
      let tail = 0;
      for (const probability of pending.values()) tail += probability;
      if (tail < 1e-16) break;
    }

    for (const [successes, probability] of pending) {
      addTo(result, successes, probability);
    }

    return normalize(result);
  }

  function computeSuccess(spec) {
    const primary = spec.primary || { count: 1, sides: 10 };
    const extras = Array.isArray(spec.extras) ? spec.extras : [];
    const groups = [primary, ...extras].filter(
      (group) => group && group.count > 0 && group.sides > 1
    );
    const target = clamp(toInt(spec.successTarget, 8), -1000, 1000);
    const explode = Boolean(spec.explode);
    const bonus = toInt(spec.bonus, 0);

    let distribution = flat(0);
    for (const group of groups) {
      const perDie = successDie(group.sides, target, explode);
      const pool = convolveRepeated(perDie, clamp(toInt(group.count, 1), 1, MAX_DICE));
      distribution = convolve(distribution, pool);
    }

    return normalize(shift(clean(distribution), bonus));
  }

  function probabilityAtLeast(distribution, threshold) {
    let probability = 0;
    for (const [value, chance] of distribution) {
      if (value >= threshold) probability += chance;
    }
    return clamp(probability, 0, 1);
  }

  function probabilityAtMost(distribution, threshold) {
    let probability = 0;
    for (const [value, chance] of distribution) {
      if (value <= threshold) probability += chance;
    }
    return clamp(probability, 0, 1);
  }

  function probabilityExactly(distribution, threshold) {
    return clamp(distribution.get(threshold) || 0, 0, 1);
  }

  function quantile(entries, probability, total) {
    let cumulative = 0;
    for (const [value, chance] of entries) {
      cumulative += chance;
      if (cumulative / total >= probability - 1e-12) return value;
    }
    return entries.length ? entries[entries.length - 1][0] : 0;
  }

  function analyze(distribution) {
    const entries = sortedEntries(distribution).filter(([, chance]) => chance > EPS);
    let total = 0;
    for (const [, chance] of entries) total += chance;
    if (!entries.length || total <= 0) {
      return {
        entries: [],
        min: 0,
        max: 0,
        mean: 0,
        variance: 0,
        sd: 0,
        q25: 0,
        median: 0,
        q75: 0,
        mode: 0,
        modeValues: [],
        modeProbability: 0,
        totalProbability: 0,
      };
    }

    const min = entries[0][0];
    const max = entries[entries.length - 1][0];
    let mean = 0;
    for (const [value, chance] of entries) mean += value * chance;
    mean /= total;

    let variance = 0;
    for (const [value, chance] of entries) {
      variance += (value - mean) * (value - mean) * chance;
    }
    variance /= total;

    let modeProbability = 0;
    for (const [, chance] of entries) {
      if (chance > modeProbability) modeProbability = chance;
    }
    const tolerance = Math.max(1e-12, modeProbability * 1e-9);
    const modeValues = entries
      .filter(([, chance]) => modeProbability - chance <= tolerance)
      .map(([value]) => value);

    return {
      entries,
      min,
      max,
      mean,
      variance,
      sd: Math.sqrt(Math.max(0, variance)),
      q10: quantile(entries, 0.1, total),
      q25: quantile(entries, 0.25, total),
      median: quantile(entries, 0.5, total),
      q75: quantile(entries, 0.75, total),
      q90: quantile(entries, 0.9, total),
      mode: modeValues[0],
      modeValues,
      modeProbability: modeProbability / total,
      totalProbability: total,
    };
  }

  function compareDistributions(first, second) {
    const firstEntries = sortedEntries(normalize(first));
    const secondEntries = sortedEntries(normalize(second));
    let winFirst = 0;
    let tie = 0;
    let winSecond = 0;
    const margin = new Map();

    for (const [valueA, probabilityA] of firstEntries) {
      if (probabilityA <= EPS) continue;
      for (const [valueB, probabilityB] of secondEntries) {
        if (probabilityB <= EPS) continue;
        const chance = probabilityA * probabilityB;
        const difference = valueA - valueB;
        addTo(margin, difference, chance);
        if (difference > 0) winFirst += chance;
        else if (difference < 0) winSecond += chance;
        else tie += chance;
      }
    }

    const total = winFirst + tie + winSecond;
    return {
      winFirst: total ? winFirst / total : 0,
      tie: total ? tie / total : 0,
      winSecond: total ? winSecond / total : 0,
      atLeastTie: total ? (winFirst + tie) / total : 0,
      margin: normalize(margin),
    };
  }

  function rollDie(sides, explode) {
    sides = clamp(toInt(sides, 6), 2, 1000);
    const faces = [];
    let total = 0;
    for (let depth = 0; depth < MAX_EXPLOSION_DEPTH; depth += 1) {
      const face = 1 + Math.floor(Math.random() * sides);
      faces.push(face);
      total += face;
      if (!explode || face !== sides) break;
    }
    return {
      faces,
      total,
      value: faces[0],
      exploded: faces.length > 1,
      extra: total - faces[0],
    };
  }

  function rollSum(spec) {
    const primary = spec.primary || { count: 1, sides: 20 };
    const extras = Array.isArray(spec.extras) ? spec.extras : [];
    const keep = spec.keep || { mode: "all", count: primary.count };
    const explode = Boolean(spec.explode);
    const count = clamp(toInt(primary.count, 1), 1, MAX_DICE);

    const primaryDice = Array.from({ length: count }, () =>
      rollDie(primary.sides, explode)
    );
    const sortedValues = primaryDice
      .map((die) => die.total)
      .sort((a, b) => (keep.mode === "low" ? a - b : b - a));
    const keepCount =
      keep.mode === "all" ? count : clamp(toInt(keep.count, count), 1, count);
    const keptValues = sortedValues.slice(0, keepCount);
    const thresholdValue = keptValues[keptValues.length - 1];

    // Marca exatamente a quantidade de dados mantidos, sem depender de valores unicos.
    let stillToKeep = keepCount;
    for (const die of primaryDice) {
      const qualifies =
        keep.mode === "high"
          ? die.total >= thresholdValue
          : keep.mode === "low"
            ? die.total <= thresholdValue
            : true;
      if (qualifies && stillToKeep > 0) {
        die.kept = true;
        stillToKeep -= 1;
      } else {
        die.kept = false;
      }
    }

    const extraDice = [];
    for (const group of extras) {
      if (!group || group.count <= 0) continue;
      const groupDice = [];
      for (let index = 0; index < clamp(toInt(group.count, 1), 1, MAX_DICE); index += 1) {
        const die = rollDie(group.sides, explode);
        die.kept = true;
        groupDice.push(die);
      }
      extraDice.push({ group, dice: groupDice });
    }

    let total = toInt(spec.bonus, 0);
    for (const die of primaryDice) if (die.kept) total += die.total;
    for (const group of extraDice) {
      for (const die of group.dice) total += die.total;
    }

    return {
      mode: "sum",
      primaryDice,
      extraGroups: extraDice,
      keptCount: keepCount,
      total,
    };
  }

  function rollSuccess(spec) {
    const primary = spec.primary || { count: 1, sides: 10 };
    const extras = Array.isArray(spec.extras) ? spec.extras : [];
    const target = clamp(toInt(spec.successTarget, 8), -1000, 1000);
    const explode = Boolean(spec.explode);
    const groups = [];

    for (const group of [primary, ...extras]) {
      if (!group || group.count <= 0) continue;
      const dice = [];
      for (let index = 0; index < clamp(toInt(group.count, 1), 1, MAX_DICE); index += 1) {
        const die = rollDie(group.sides, explode);
        die.successes = die.faces.reduce(
          (total, face) => total + (face >= target ? 1 : 0),
          0
        );
        die.kept = true;
        dice.push(die);
      }
      groups.push({ group, dice });
    }

    let successes = toInt(spec.bonus, 0);
    for (const group of groups) {
      for (const die of group.dice) successes += die.successes;
    }

    return {
      mode: "success",
      groups,
      target,
      total: successes,
    };
  }

  return {
    EPS,
    MAX_DICE,
    clamp,
    toInt,
    normalize,
    clean,
    shift,
    flat,
    convolve,
    convolveRepeated,
    sortedEntries,
    baseDie,
    keepDistribution,
    groupDistribution,
    computeSum,
    successDie,
    computeSuccess,
    probabilityAtLeast,
    probabilityAtMost,
    probabilityExactly,
    analyze,
    compareDistributions,
    rollDie,
    rollSum,
    rollSuccess,
  };
});
