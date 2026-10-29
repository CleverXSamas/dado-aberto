/*
 * Dado Aberto — interface
 * Controle da calculadora visual, gráficos e modo duelo.
 * Sem dependências. Toda a matemática vem de window.DiceEngine.
 */
(function () {
  "use strict";

  const Engine = window.DiceEngine;
  if (!Engine) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100];
  const STORAGE_KEY = "dado-aberto-state-v1";
  const THEME_KEY = "dado-aberto-theme";
  const SOUND_KEY = "dado-aberto-sound";
  const MAX_UI_DICE = 20;
  const MAX_EXTRAS = 6;
  const DEFAULT_SPEC = {
    count: 1,
    sides: 20,
    keepMode: "all",
    keepCount: 3,
    explode: false,
    successTarget: 8,
    bonus: 5,
    extras: [],
  };
  const DEFAULT_DUEL = {
    a: { count: 1, sides: 20, keepMode: "all", keepCount: 1, bonus: 5 },
    b: { count: 1, sides: 20, keepMode: "all", keepCount: 1, bonus: 3 },
  };
  const PRESETS = [
    {
      id: "check",
      icon: "d20",
      title: "Teste de d20",
      subtitle: "1d20 + 5 → 15",
      mode: "sum",
      dc: 15,
      spec: { count: 1, sides: 20, keepMode: "all", keepCount: 3, bonus: 5, explode: false, extras: [] },
    },
    {
      id: "advantage",
      icon: "2d20↑",
      title: "Vantagem",
      subtitle: "2d20, melhor → 15",
      mode: "sum",
      dc: 15,
      spec: { count: 2, sides: 20, keepMode: "high", keepCount: 1, bonus: 5, explode: false, extras: [] },
    },
    {
      id: "disadvantage",
      icon: "2d20↓",
      title: "Desvantagem",
      subtitle: "2d20, pior → 15",
      mode: "sum",
      dc: 15,
      spec: { count: 2, sides: 20, keepMode: "low", keepCount: 1, bonus: 5, explode: false, extras: [] },
    },
    {
      id: "abilities",
      icon: "4d6",
      title: "Atributos",
      subtitle: "4d6, melhores 3 → 12",
      mode: "sum",
      dc: 12,
      spec: { count: 4, sides: 6, keepMode: "high", keepCount: 3, bonus: 0, explode: false, extras: [] },
    },
    {
      id: "damage",
      icon: "2d6",
      title: "Dano",
      subtitle: "2d6 + 3 → 8",
      mode: "sum",
      dc: 8,
      spec: { count: 2, sides: 6, keepMode: "all", keepCount: 3, bonus: 3, explode: false, extras: [] },
    },
    {
      id: "pool",
      icon: "5d10",
      title: "Poço de sucessos",
      subtitle: "5d10, sucesso 8+ → 2",
      mode: "success",
      dc: 2,
      spec: { count: 5, sides: 10, keepMode: "all", keepCount: 3, bonus: 0, explode: false, successTarget: 8, extras: [] },
    },
    {
      id: "exploding",
      icon: "3d6!",
      title: "Dados explosivos",
      subtitle: "3d6 explodem → 12",
      mode: "sum",
      dc: 12,
      spec: { count: 3, sides: 6, keepMode: "all", keepCount: 3, bonus: 0, explode: true, extras: [] },
    },
  ];

  const state = {
    view: "calc",
    mode: "sum",
    spec: clone(DEFAULT_SPEC),
    dcByMode: { sum: 15, success: 2 },
    dc: 15,
    chartMode: "exact",
    tableOpen: false,
    duel: clone(DEFAULT_DUEL),
    lastCalc: null,
    lastDuel: null,
  };

  const dom = {
    body: document.body,
    hero: $("#hero"),
    calcView: $("#calcView"),
    duelView: $("#duelView"),
    calcWorkspace: $("#calcWorkspace"),
    presetList: $("#presetList"),
    modeTabs: $$(".mode-tab"),
    primaryCount: $("#primaryCount"),
    diePicker: $("#diePicker"),
    keepMode: $("#keepMode"),
    keepDetail: $("#keepDetail"),
    keepCount: $("#keepCount"),
    keepDetailLabel: $("#keepDetailLabel"),
    sumRules: $("#sumRules"),
    explodeSection: $("#explodeSection"),
    explodeToggle: $("#explodeToggle"),
    explodeHint: $("#explodeHint"),
    successRules: $("#successRules"),
    successTarget: $("#successTarget"),
    bonusInput: $("#bonusInput"),
    bonusHint: $("#bonusHint"),
    addExtra: $("#addExtra"),
    extraList: $("#extraList"),
    extrasHelp: $("#extrasHelp"),
    formulaText: $("#formulaText"),
    copyFormula: $("#copyFormula"),
    rollSummary: $("#rollSummary"),
    resetButton: $("#resetButton"),
    rollButton: $("#rollButton"),
    rollButtonLabel: $("#rollButtonLabel"),
    rollResult: $("#rollResult"),
    dcInput: $("#dcInput"),
    dcLabel: $("#dcLabel"),
    probabilityValue: $("#probabilityValue"),
    probabilitySentence: $("#probabilitySentence"),
    oddsPill: $("#oddsPill"),
    probabilityDetail: $("#probabilityDetail"),
    chart: $("#chart"),
    chartTooltip: $("#chartTooltip"),
    chartA11y: $("#chartA11y"),
    chartHint: $("#chartHint"),
    chartNote: $("#chartNote"),
    chartLegend: $("#chartLegend"),
    chartMode: $("#chartMode"),
    statMean: $("#statMean"),
    statMeanSub: $("#statMeanSub"),
    statMode: $("#statMode"),
    statModeSub: $("#statModeSub"),
    statRange: $("#statRange"),
    statRangeSub: $("#statRangeSub"),
    statSd: $("#statSd"),
    statSdSub: $("#statSdSub"),
    plainExplanation: $("#plainExplanation"),
    tableToggle: $("#tableToggle"),
    tablePanel: $("#tablePanel"),
    tableCount: $("#tableCount"),
    distributionTable: $("#distributionTable"),
    tableValueHead: $("#tableValueHead"),
    countA: $("#countA"),
    dieA: $("#dieA"),
    keepA: $("#keepA"),
    keepAControl: $("#keepAControl"),
    keepCountA: $("#keepCountA"),
    bonusA: $("#bonusA"),
    duelFormulaA: $("#duelFormulaA"),
    duelMetaA: $("#duelMetaA"),
    countB: $("#countB"),
    dieB: $("#dieB"),
    keepB: $("#keepB"),
    keepBControl: $("#keepBControl"),
    keepCountB: $("#keepCountB"),
    bonusB: $("#bonusB"),
    duelFormulaB: $("#duelFormulaB"),
    duelMetaB: $("#duelMetaB"),
    duelWinner: $("#duelWinner"),
    duelWinRate: $("#duelWinRate"),
    duelVerdictDetail: $("#duelVerdictDetail"),
    duelSplit: $("#duelSplit"),
    duelBarA: $("#duelBarA"),
    duelBarTie: $("#duelBarTie"),
    duelBarB: $("#duelBarB"),
    duelStatA: $("#duelStatA"),
    duelStatTie: $("#duelStatTie"),
    duelStatB: $("#duelStatB"),
    duelStatMargin: $("#duelStatMargin"),
    duelChart: $("#duelChart"),
    duelTooltip: $("#duelTooltip"),
    duelChartNote: $("#duelChartNote"),
    duelExplain: $("#duelExplain"),
    swapDuel: $("#swapDuel"),
    themeToggle: $("#themeToggle"),
    soundToggle: $("#soundToggle"),
    soundToggleLabel: $("#soundToggleLabel"),
    shareButton: $("#shareButton"),
    toast: $("#toast"),
    themeMeta: $('meta[name="theme-color"]'),
  };

  let toastTimer = 0;
  let rollTimer = 0;
  let rollToken = 0;
  let soundEnabled = true;
  let audioContext = null;
  let audioMaster = null;
  let audioNoise = null;
  const activeSfx = new Set();
  let calcCommitTimer = 0;
  let duelCommitTimer = 0;
  let chartFrame = 0;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toInt(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  }

  function clampInt(value, min, max, fallback) {
    return clamp(toInt(value, fallback), min, max);
  }

  function formatNumber(value, maxDecimals = 1) {
    if (!Number.isFinite(value)) value = 0;
    return value.toLocaleString("pt-BR", {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 0,
    });
  }

  function formatPercent(probability, decimals = 1) {
    if (!Number.isFinite(probability)) probability = 0;
    const percent = clamp(probability, 0, 1) * 100;
    return `${percent.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}%`;
  }

  function formatPercentSmart(probability) {
    if (!Number.isFinite(probability) || probability <= 0) return "0%";
    if (probability >= 1) return "100%";
    const percent = probability * 100;
    const decimals = percent < 0.01 ? 4 : percent < 0.1 ? 3 : percent < 1 ? 2 : 1;
    return `${percent.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals === 1 ? 1 : 0,
      maximumFractionDigits: decimals,
    })}%`;
  }

  function formatSigned(value, decimals = 1) {
    const rounded = Math.abs(value) < 1e-10 ? 0 : value;
    if (rounded === 0) return "0";
    const sign = rounded > 0 ? "+" : "−";
    return sign + formatNumber(Math.abs(rounded), decimals);
  }

  function plural(count, singular, pluralForm) {
    return count === 1 ? singular : pluralForm;
  }

  function diceText(count, sides) {
    return `${count}d${sides}`;
  }

  function notationBonus(value) {
    if (!value) return "";
    return value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
  }

  function setText(element, text) {
    if (element) element.textContent = text;
  }

  function setHTML(element, html) {
    if (element) element.innerHTML = html;
  }

  function activeElementValue(element, value) {
    if (document.activeElement === element && element.value === String(value)) return;
    if (element.value !== String(value)) element.value = String(value);
  }

  function allowedSides(value) {
    const sides = clampInt(value, 2, 1000, 20);
    if (DIE_SIDES.includes(sides)) return sides;
    return DIE_SIDES.reduce((best, option) =>
      Math.abs(option - sides) < Math.abs(best - sides) ? option : best
    , DIE_SIDES[0]);
  }

  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, 2400);
  }

  function readStoredState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return null;
      return saved;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.mode,
        spec: state.spec,
        dc: state.dc,
        dcByMode: state.dcByMode,
        chartMode: state.chartMode,
        duel: state.duel,
      }));
    } catch (error) {
      /* localStorage pode estar bloqueado; o app continua funcionando. */
    }
  }

  function extrasString(extras) {
    return extras.map((extra) => `${extra.count}d${extra.sides}`).join(",");
  }

  function buildCalcHash() {
    const params = new URLSearchParams();
    params.set("m", state.mode);
    params.set("q", String(state.spec.count));
    params.set("d", String(state.spec.sides));
    const keep = state.spec.keepMode === "all"
      ? "all"
      : `${state.spec.keepMode === "high" ? "h" : "l"}${state.spec.keepCount}`;
    params.set("k", keep);
    params.set("e", state.spec.explode ? "1" : "0");
    params.set("b", String(state.spec.bonus));
    params.set("t", String(state.spec.successTarget));
    params.set("dc", String(state.dc));
    if (state.spec.extras.length) params.set("x", extrasString(state.spec.extras));
    return `#calc?${params.toString()}`;
  }

  function buildDuelHash() {
    const params = new URLSearchParams();
    const sides = [["a", state.duel.a], ["b", state.duel.b]];
    for (const [prefix, side] of sides) {
      params.set(`${prefix}q`, String(side.count));
      params.set(`${prefix}d`, String(side.sides));
      params.set(`${prefix}k`, side.keepMode);
      params.set(`${prefix}kc`, String(side.keepCount));
      params.set(`${prefix}b`, String(side.bonus));
    }
    return `#duel?${params.toString()}`;
  }

  function buildShareUrl() {
    return `${location.href.split("#")[0]}${state.view === "duel" ? buildDuelHash() : buildCalcHash()}`;
  }

  function parseExtras(text) {
    if (!text) return [];
    return String(text).split(",").map((part) => {
      const match = part.trim().match(/^(\d+)d(\d+)$/i);
      if (!match) return null;
      return {
        count: clampInt(match[1], 1, MAX_UI_DICE, 1),
        sides: clampInt(match[2], 2, 1000, 6),
      };
    }).filter(Boolean).slice(0, MAX_EXTRAS);
  }

  function parseKeep(text) {
    if (!text || text === "all") return { mode: "all", count: 3 };
    const match = String(text).match(/^([hl])(\d+)$/i);
    if (!match) return { mode: "all", count: 3 };
    return {
      mode: match[1].toLowerCase() === "h" ? "high" : "low",
      count: clampInt(match[2], 1, MAX_UI_DICE, 3),
    };
  }

  function restoreFromHash() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return false;
    const [kind, query = ""] = raw.split("?");
    if (kind !== "calc" && kind !== "duel") return false;
    const params = new URLSearchParams(query);
    if (kind === "calc") {
      state.view = "calc";
      state.mode = params.get("m") === "success" ? "success" : "sum";
      state.spec.count = clampInt(params.get("q"), 1, MAX_UI_DICE, 1);
      state.spec.sides = allowedSides(params.get("d") || 20);
      const keep = parseKeep(params.get("k"));
      state.spec.keepMode = keep.mode;
      state.spec.keepCount = clamp(keep.count, 1, state.spec.count);
      state.spec.explode = params.get("e") === "1";
      state.spec.bonus = clampInt(params.get("b"), -50, 50, 5);
      state.spec.successTarget = clampInt(params.get("t"), 1, 100, 8);
      state.spec.extras = parseExtras(params.get("x"));
      const dc = clampInt(params.get("dc"), -50, 1000, state.mode === "success" ? 2 : 15);
      state.dc = dc;
      state.dcByMode[state.mode] = dc;
      return true;
    }
    state.view = "duel";
    for (const [prefix, key] of [["a", "a"], ["b", "b"]]) {
      const side = state.duel[key];
      side.count = clampInt(params.get(`${prefix}q`), 1, 12, side.count);
      side.sides = allowedSides(params.get(`${prefix}d`) || side.sides);
      const keep = params.get(`${prefix}k`);
      side.keepMode = keep === "high" || keep === "low" ? keep : "all";
      side.keepCount = clampInt(params.get(`${prefix}kc`), 1, side.count, 1);
      side.bonus = clampInt(params.get(`${prefix}b`), -30, 30, side.bonus);
    }
    return true;
  }

  function restoreState() {
    if (restoreFromHash()) return;
    const stored = readStoredState();
    if (!stored) return;
    if (stored.mode === "success" || stored.mode === "sum") state.mode = stored.mode;
    if (stored.spec && typeof stored.spec === "object") {
      state.spec = Object.assign(state.spec, stored.spec);
      if (!Array.isArray(state.spec.extras)) state.spec.extras = [];
    }
    if (stored.dcByMode && typeof stored.dcByMode === "object") {
      state.dcByMode.sum = clampInt(stored.dcByMode.sum, -50, 1000, 15);
      state.dcByMode.success = clampInt(stored.dcByMode.success, -50, 1000, 2);
    }
    state.dc = clampInt(stored.dc, -50, 1000, state.dcByMode[state.mode]);
    if (stored.chartMode === "atleast") state.chartMode = "atleast";
    if (stored.duel && stored.duel.a && stored.duel.b) {
      state.duel = Object.assign(state.duel, stored.duel);
    }
  }

  function sanitizeState() {
    const spec = state.spec;
    spec.count = clampInt(spec.count, 1, MAX_UI_DICE, 1);
    spec.sides = allowedSides(spec.sides);
    spec.keepMode = spec.keepMode === "high" || spec.keepMode === "low" ? spec.keepMode : "all";
    spec.keepCount = clampInt(
      spec.keepCount,
      1,
      spec.keepMode === "all" ? MAX_UI_DICE : spec.count,
      Math.min(3, spec.count)
    );
    spec.successTarget = clampInt(spec.successTarget, 1, 100, 8);
    spec.bonus = clampInt(spec.bonus, -50, 50, 0);
    spec.explode = Boolean(spec.explode);
    spec.extras = (Array.isArray(spec.extras) ? spec.extras : [])
      .map((extra) => ({
        count: clampInt(extra.count, 1, MAX_UI_DICE, 1),
        sides: clampInt(extra.sides, 2, 1000, 6),
      }))
      .filter((extra) => extra.count > 0)
      .slice(0, MAX_EXTRAS);

    for (const key of ["a", "b"]) {
      const side = state.duel[key];
      side.count = clampInt(side.count, 1, 12, 1);
      side.sides = allowedSides(side.sides);
      side.keepMode = side.keepMode === "high" || side.keepMode === "low" ? side.keepMode : "all";
      side.keepCount = clampInt(side.keepCount, 1, side.count, 1);
      side.bonus = clampInt(side.bonus, -30, 30, 0);
    }

    state.dcByMode.sum = clampInt(state.dcByMode.sum, -50, 1000, 15);
    state.dcByMode.success = clampInt(state.dcByMode.success, -50, 1000, 2);
    state.dc = clampInt(state.dc, -50, 1000, state.dcByMode[state.mode]);
    state.dcByMode[state.mode] = state.dc;
  }

  function engineSumSpec(spec) {
    return {
      primary: { count: spec.count, sides: spec.sides },
      extras: spec.extras.map((extra) => ({ count: extra.count, sides: extra.sides })),
      keep: { mode: spec.keepMode, count: spec.keepMode === "all" ? spec.count : spec.keepCount },
      explode: Boolean(spec.explode),
      bonus: spec.bonus,
    };
  }

  function engineSuccessSpec(spec) {
    return {
      primary: { count: spec.count, sides: spec.sides },
      extras: spec.extras.map((extra) => ({ count: extra.count, sides: extra.sides })),
      successTarget: spec.successTarget,
      explode: Boolean(spec.explode),
      bonus: spec.bonus,
    };
  }

  function engineSpec() {
    return state.mode === "success" ? engineSuccessSpec(state.spec) : engineSumSpec(state.spec);
  }

  function computeCurrentDistribution() {
    return state.mode === "success"
      ? Engine.computeSuccess(engineSpec())
      : Engine.computeSum(engineSpec());
  }

  function canonicalSpec(mode, spec) {
    if (mode === "success") {
      return JSON.stringify({
        mode,
        count: spec.count,
        sides: spec.sides,
        explode: Boolean(spec.explode),
        successTarget: spec.successTarget,
        bonus: spec.bonus,
        extras: spec.extras.map((extra) => [extra.count, extra.sides]),
      });
    }
    return JSON.stringify({
      mode,
      count: spec.count,
      sides: spec.sides,
      keepMode: spec.keepMode,
      keepCount: spec.keepMode === "all" ? null : spec.keepCount,
      explode: Boolean(spec.explode),
      bonus: spec.bonus,
      extras: spec.extras.map((extra) => [extra.count, extra.sides]),
    });
  }

  function presetIsActive(preset) {
    return preset.mode === state.mode && canonicalSpec(preset.mode, preset.spec) === canonicalSpec(state.mode, state.spec);
  }

  function notationFor(mode, spec) {
    let text = diceText(spec.count, spec.sides);
    if (mode === "sum") {
      if (spec.keepMode === "high") text += `kh${spec.keepCount}`;
      if (spec.keepMode === "low") text += `kl${spec.keepCount}`;
    }
    if (spec.explode) text += "!";
    for (const extra of spec.extras) text += ` + ${diceText(extra.count, extra.sides)}`;
    text += notationBonus(spec.bonus);
    return text;
  }

  function wordsFor(mode, spec) {
    const base = diceText(spec.count, spec.sides);
    if (mode === "success") {
      let words = `Role ${base} e conte como sucesso cada dado que tirar ${spec.successTarget} ou mais`;
      if (spec.explode) words += ", rolando de novo quando sair o máximo";
      if (spec.extras.length) {
        const list = spec.extras.map((extra) => diceText(extra.count, extra.sides)).join(" e ");
        words += `; some também ${list}`;
      }
      if (spec.bonus > 0) words += `, e acrescente ${spec.bonus} ${plural(spec.bonus, "sucesso", "sucessos")}`;
      if (spec.bonus < 0) words += `, e subtraia ${Math.abs(spec.bonus)} ${plural(Math.abs(spec.bonus), "sucesso", "sucessos")}`;
      return `${words}.`;
    }

    let words = `Role ${base}`;
    if (spec.keepMode === "high") {
      words += `, mantenha ${spec.keepCount === 1 ? "o maior" : `os ${spec.keepCount} maiores`}`;
    }
    if (spec.keepMode === "low") {
      words += `, mantenha ${spec.keepCount === 1 ? "o menor" : `os ${spec.keepCount} menores`}`;
    }
    if (spec.explode) words += " e role de novo quando sair o valor máximo";
    if (spec.extras.length) {
      const list = spec.extras.map((extra) => diceText(extra.count, extra.sides)).join(" e ");
      words += `, some ${list}`;
    }
    if (spec.bonus > 0) words += ` e some ${spec.bonus}`;
    if (spec.bonus < 0) words += ` e subtraia ${Math.abs(spec.bonus)}`;
    return `${words}.`;
  }

  function svgNode(name, attributes) {
    const node = document.createElementNS(SVG_NS, name);
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined && value !== null) node.setAttribute(key, String(value));
      }
    }
    return node;
  }

  function niceScale(maxPercent) {
    const candidates = [1, 2, 5, 10, 20, 25, 50, 100];
    let step = candidates[candidates.length - 1];
    for (const candidate of candidates) {
      if (maxPercent / candidate <= 4) {
        step = candidate;
        break;
      }
    }
    const top = Math.max(step, Math.ceil(Math.max(maxPercent, 0.001) / step) * step);
    return { step, top };
  }

  function makeBars(entries, maxBars) {
    if (!entries.length) return [];
    if (entries.length <= maxBars) {
      return entries.map(([value, probability]) => ({
        start: value,
        end: value,
        probability,
      }));
    }
    const min = entries[0][0];
    const max = entries[entries.length - 1][0];
    const span = Math.max(1, max - min + 1);
    const count = Math.min(maxBars, entries.length);
    const groups = Array.from({ length: count }, (_, index) => ({
      start: min + Math.floor((index * span) / count),
      end: min + Math.floor(((index + 1) * span) / count) - 1,
      probability: 0,
    }));
    for (const [value, probability] of entries) {
      const index = clamp(Math.floor(((value - min) / span) * count), 0, count - 1);
      groups[index].probability += probability;
      groups[index].end = Math.max(groups[index].end, value);
    }
    return groups.filter((group) => group.probability > 0);
  }

  function chooseLabelIndexes(count, width) {
    if (count <= 1) return [0];
    const maxLabels = clamp(Math.floor(width / 67), 3, 9);
    if (count <= maxLabels) return Array.from({ length: count }, (_, index) => index);
    const indexes = new Set([0, count - 1]);
    const slots = maxLabels - 2;
    for (let index = 1; index <= slots; index += 1) {
      indexes.add(Math.round((index * (count - 1)) / (slots + 1)));
    }
    return [...indexes].sort((a, b) => a - b);
  }

  function createChart(config) {
    const { svg, tooltip, a11y, kind, onSelect } = config;
    const controller = {
      bars: [],
      options: null,
      render,
      redraw: draw,
    };
    let bars = [];
    let options = null;
    let cursorValue = null;
    let hovered = false;

    function tailAt(entries, value) {
      let probability = 0;
      for (const [entryValue, chance] of entries) {
        if (entryValue >= value) probability += chance;
      }
      return probability;
    }

    function barLabel(bar) {
      return bar.start === bar.end ? String(bar.start) : `${bar.start}–${bar.end}`;
    }

    function barClass(bar) {
      let className = "bar";
      const target = options.target;
      if (kind === "duel") {
        if (bar.start > 0) className += " is-positive";
        else if (bar.start < 0) className += " is-negative";
        else className += " is-zero";
      } else if (options.mode === "atleast" ? bar.start >= target : bar.end >= target) {
        className += " is-above";
      }
      return className;
    }

    function tooltipContent(bar) {
      if (!tooltip) return;
      tooltip.replaceChildren();
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      const extra = document.createElement("span");

      if (kind === "duel") {
        if (bar.start > 0) title.textContent = `A vence por ${barLabel(bar)}`;
        else if (bar.start < 0) title.textContent = `B vence por ${Math.abs(bar.start)}${bar.start === bar.end ? "" : `–${Math.abs(bar.end)}`}`;
        else title.textContent = bar.start === bar.end ? "Empate" : "Margem próxima de zero";
        detail.textContent = `${formatPercentSmart(bar.probability)} dos confrontos`;
        extra.textContent = bar.start === bar.end
          ? `margem ${formatSigned(bar.start)}`
          : `margens de ${bar.start} a ${bar.end}`;
      } else {
        const label = bar.start === bar.end
          ? `${options.valueName} ${bar.start}`
          : `${options.valueName}s ${bar.start}–${bar.end}`;
        title.textContent = label;
        if (options.mode === "atleast") {
          detail.textContent = `${formatPercentSmart(tailAt(options.entries, bar.start))} de alcançar ${bar.start} ou mais`;
          extra.textContent = `${formatPercentSmart(bar.probability)} exatamente nesta faixa`;
        } else {
          detail.textContent = `${formatPercentSmart(bar.probability)} de cair exatamente ${bar.start === bar.end ? "aqui" : "nesta faixa"}`;
          extra.textContent = `${formatPercentSmart(tailAt(options.entries, bar.start))} de alcançar ${bar.start} ou mais`;
        }
      }

      tooltip.append(title, detail, extra);
    }

    function positionTooltip(bar, group) {
      if (!tooltip) return;
      const wrap = tooltip.parentElement;
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const barRect = group.getBoundingClientRect();
      let left = barRect.left + barRect.width / 2 - wrapRect.left;
      left = clamp(left, 70, Math.max(70, wrapRect.width - 70));
      let top = barRect.top - wrapRect.top - 4;
      tooltip.classList.remove("is-below");
      if (top < 76) {
        top = barRect.top - wrapRect.top + 5;
        tooltip.classList.add("is-below");
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }

    function setCursor(index) {
      if (!bars.length) return;
      const safeIndex = (index + bars.length) % bars.length;
      const bar = bars[safeIndex];
      cursorValue = bar.start;
      $$(".bar-group", svg).forEach((group, groupIndex) => {
        group.classList.toggle("is-cursor", groupIndex === safeIndex);
      });
      const group = $$(".bar-group", svg)[safeIndex];
      if (group) {
        tooltipContent(bar);
        if (tooltip) tooltip.hidden = false;
        positionTooltip(bar, group);
      }
      if (a11y) {
        if (kind === "duel") {
          a11y.textContent = `Margem ${barLabel(bar)}: ${formatPercentSmart(bar.probability)} dos confrontos.`;
        } else {
          const chance = options.mode === "atleast"
            ? tailAt(options.entries, bar.start)
            : bar.probability;
          a11y.textContent = `${options.valueName} ${barLabel(bar)}: ${formatPercentSmart(chance)}. Use as setas para percorrer e Enter para mirar.`;
        }
      }
    }

    function hideTooltip() {
      if (tooltip) tooltip.hidden = true;
      $$(".bar-group", svg).forEach((group) => group.classList.remove("is-cursor"));
    }

    function draw() {
      if (!options) return;
      const rect = svg.getBoundingClientRect();
      const width = Math.round(rect.width);
      if (!width) return;
      const height = Math.round(rect.height) || (kind === "duel" ? 260 : 290);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.replaceChildren();
      hideTooltip();

      const entries = options.entries;
      if (!entries || !entries.length) {
        const empty = svgNode("text", {
          x: width / 2,
          y: height / 2,
          "text-anchor": "middle",
          class: "axis-text is-strong",
        });
        empty.textContent = "Sem resultados para mostrar";
        svg.append(empty);
        return;
      }

      const compact = width < 520;
      const margin = {
        top: 38,
        right: compact ? 8 : 14,
        bottom: compact ? 26 : 30,
        left: compact ? 34 : 42,
      };
      const plotWidth = Math.max(20, width - margin.left - margin.right);
      const plotHeight = Math.max(20, height - margin.top - margin.bottom);
      const baseY = margin.top + plotHeight;
      const maxBars = compact ? 34 : 48;
      bars = makeBars(entries, maxBars);
      const barSpace = plotWidth / bars.length;
      const barWidth = Math.max(1.2, barSpace - (barSpace > 7 ? 2.2 : 1));

      const plotted = bars.map((bar) => (
        options.mode === "atleast" ? tailAt(entries, bar.start) : bar.probability
      ));
      const maxPercent = Math.max(...plotted, 0) * 100;
      const scale = niceScale(maxPercent);

      const gridGroup = svgNode("g", { "aria-hidden": "true" });
      for (let value = 0; value <= scale.top + 0.001; value += scale.step) {
        const y = baseY - (value / scale.top) * plotHeight;
        gridGroup.append(svgNode("line", {
          x1: margin.left,
          x2: margin.left + plotWidth,
          y1: y,
          y2: y,
          class: value === 0 ? "axis-line" : "grid-line",
        }));
        const label = svgNode("text", {
          x: margin.left - 7,
          y: y + 3,
          "text-anchor": "end",
          class: "axis-text",
        });
        label.textContent = `${formatNumber(value, 0)}%`;
        gridGroup.append(label);
      }
      svg.append(gridGroup);

      const barsGroup = svgNode("g", { role: "list" });
      bars.forEach((bar, index) => {
        const chance = plotted[index];
        const barHeight = chance <= 0 ? 0 : Math.max(0.8, (chance / (scale.top / 100)) * plotHeight);
        const x = margin.left + index * barSpace;
        const y = baseY - barHeight;
        const group = svgNode("g", {
          class: "bar-group",
          role: "listitem",
          "data-index": index,
          "data-value": bar.start,
        });

        const rectBar = svgNode("rect", {
          x,
          y,
          width: barWidth,
          height: Math.max(barHeight, 0.8),
          rx: barSpace > 9 ? 2 : 1,
          class: barClass(bar),
        });
        const hit = svgNode("rect", {
          x,
          y: margin.top,
          width: Math.max(1, barSpace),
          height: plotHeight,
          class: "bar-hit",
          tabindex: -1,
        });
        const title = svgNode("title");
        title.textContent = kind === "duel"
          ? `Margem ${barLabel(bar)}: ${formatPercentSmart(bar.probability)}`
          : `${options.valueName} ${barLabel(bar)}: ${formatPercentSmart(bar.probability)}`;
        group.append(rectBar, hit, title);
        group.addEventListener("mouseenter", () => {
          hovered = true;
          tooltipContent(bar);
          if (tooltip) {
            tooltip.hidden = false;
            positionTooltip(bar, group);
          }
        });
        group.addEventListener("mouseleave", () => {
          hovered = false;
          if (tooltip) tooltip.hidden = true;
          group.classList.remove("is-cursor");
        });
        group.addEventListener("click", () => {
          if (kind === "calc" && onSelect) onSelect(bar.start);
        });
        barsGroup.append(group);
      });
      svg.append(barsGroup);

      if (kind === "calc") {
        const target = options.target;
        let targetX = margin.left;
        const targetIndex = bars.findIndex((bar) => target <= bar.end);
        if (targetIndex >= 0) targetX = margin.left + targetIndex * barSpace;
        else targetX = margin.left + plotWidth;
        if (target <= bars[0].start) targetX = margin.left;
        svg.append(svgNode("line", {
          x1: targetX,
          x2: targetX,
          y1: margin.top - 8,
          y2: baseY,
          class: "target-line",
          "aria-hidden": "true",
        }));
        const targetLabel = svgNode("text", {
          x: clamp(targetX, margin.left + 2, margin.left + plotWidth - 2),
          y: margin.top - 14,
          "text-anchor": targetX > margin.left + plotWidth * 0.76 ? "end" : targetX < margin.left + plotWidth * 0.18 ? "start" : "middle",
          class: "target-label",
          "aria-hidden": "true",
        });
        targetLabel.textContent = options.targetPrefix + target;
        svg.append(targetLabel);
      }

      if (kind === "duel") {
        const zeroIndex = bars.findIndex((bar) => bar.start >= 0);
        let zeroX = margin.left;
        if (zeroIndex >= 0) zeroX = margin.left + zeroIndex * barSpace;
        else zeroX = margin.left + plotWidth;
        svg.append(svgNode("line", {
          x1: zeroX,
          x2: zeroX,
          y1: margin.top,
          y2: baseY,
          class: "zero-line",
          "aria-hidden": "true",
        }));
        const zeroLabel = svgNode("text", {
          x: clamp(zeroX, margin.left + 8, margin.left + plotWidth - 8),
          y: margin.top - 14,
          "text-anchor": "middle",
          class: "target-label",
          "aria-hidden": "true",
        });
        zeroLabel.textContent = "empate";
        svg.append(zeroLabel);
      }

      const xAxis = svgNode("g", { "aria-hidden": "true" });
      const indexes = chooseLabelIndexes(bars.length, width);
      const labelSet = new Set(indexes);
      bars.forEach((bar, index) => {
        if (!labelSet.has(index)) return;
        const center = margin.left + index * barSpace + barSpace / 2;
        const label = svgNode("text", {
          x: center,
          y: baseY + (compact ? 15 : 17),
          "text-anchor": "middle",
          class: "axis-text",
        });
        const value = kind === "duel" && bar.start > 0 ? `+${bar.start}` : String(bar.start);
        label.textContent = bar.start === bar.end ? value : `${bar.start}–${bar.end}`;
        xAxis.append(label);
      });
      svg.append(xAxis);

      controller.bars = bars;
      if (cursorValue !== null) {
        const cursorIndex = bars.findIndex((bar) => cursorValue >= bar.start && cursorValue <= bar.end);
        if (cursorIndex >= 0) {
          const group = $$(".bar-group", svg)[cursorIndex];
          group.classList.add("is-cursor");
        }
      }
      if (a11y) {
        a11y.textContent = `${options.title}. ${bars.length} ${plural(bars.length, "coluna", "colunas")}. Use as setas para explorar${kind === "calc" ? " e Enter para mirar" : ""}.`;
      }
    }

    function render(nextOptions) {
      options = nextOptions;
      if (cursorValue === null) cursorValue = nextOptions.target;
      draw();
    }

    svg.addEventListener("keydown", (event) => {
      if (!bars.length) return;
      const currentIndex = Math.max(0, bars.findIndex((bar) => cursorValue !== null && cursorValue >= bar.start && cursorValue <= bar.end));
      let nextIndex = currentIndex;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = currentIndex + 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = currentIndex - 1;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = bars.length - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (kind === "calc" && onSelect) onSelect(bars[currentIndex].start);
        return;
      } else if (event.key === "Escape") {
        hideTooltip();
        return;
      } else {
        return;
      }
      event.preventDefault();
      setCursor(nextIndex);
    });

    svg.addEventListener("blur", () => {
      if (!hovered) hideTooltip();
    });

    svg.addEventListener("mouseleave", () => {
      if (document.activeElement !== svg) hideTooltip();
    });

    return controller;
  }

  let calcChart = null;
  let duelChart = null;

  function buildDiePicker() {
    dom.diePicker.replaceChildren();
    for (const sides of DIE_SIDES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "die-option";
      button.dataset.sides = String(sides);
      button.textContent = `d${sides}`;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `d${sides} — dado de ${sides} lados`);
      button.addEventListener("click", () => {
        state.spec.sides = sides;
        commitCalc();
      });
      dom.diePicker.append(button);
    }
  }

  function buildPresets() {
    dom.presetList.replaceChildren();
    for (const preset of PRESETS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "preset";
      button.dataset.presetId = preset.id;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `
        <span class="preset-icon">${preset.icon}</span>
        <span class="preset-copy">
          <strong>${preset.title}</strong>
          <small>${preset.subtitle}</small>
        </span>`;
      button.addEventListener("click", () => applyPreset(preset));
      dom.presetList.append(button);
    }
    updatePresetStates();
  }

  function updatePresetStates() {
    $$(".preset", dom.presetList).forEach((button) => {
      const preset = PRESETS.find((item) => item.id === button.dataset.presetId);
      const active = preset ? presetIsActive(preset) : false;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function fillDieSelect(select) {
    select.replaceChildren();
    for (const sides of DIE_SIDES) {
      const option = document.createElement("option");
      option.value = String(sides);
      option.textContent = `d${sides}`;
      select.append(option);
    }
  }

  function buildDuelControls() {
    fillDieSelect(dom.dieA);
    fillDieSelect(dom.dieB);
  }

  function syncModeUI() {
    for (const tab of dom.modeTabs) {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    }
    dom.sumRules.hidden = state.mode !== "sum";
    dom.successRules.hidden = state.mode !== "success";
    dom.dcLabel.textContent = state.mode === "success" ? "Sucessos necessários" : "Seu alvo";
    dom.bonusHint.textContent = state.mode === "success" ? "somado aos sucessos" : "somado ao total";
    dom.extrasHelp.textContent = state.mode === "success"
      ? "Cada grupo também conta sucessos, com o mesmo alvo por dado."
      : "Somados ao resultado principal. Use para dano misto.";
    dom.explodeHint.textContent = state.mode === "success"
      ? "Ao tirar o valor máximo, role de novo: cada face pode gerar outro sucesso."
      : "Ao tirar o valor máximo, role de novo e some.";
    dom.tableValueHead.textContent = state.mode === "success" ? "Sucessos" : "Resultado";
    dom.dcInput.setAttribute("aria-label", state.mode === "success" ? "Sucessos necessários" : "Alvo da rolagem");
  }

  function syncKeepUI() {
    const all = state.spec.keepMode === "all";
    dom.keepDetail.hidden = all;
    dom.keepCount.max = String(all ? MAX_UI_DICE : state.spec.count);
    activeElementValue(dom.keepCount, state.spec.keepCount);
    dom.keepDetailLabel.textContent = state.spec.keepMode === "low" ? "menores" : "maiores";
    $$("button", dom.keepMode).forEach((button) => {
      const active = button.dataset.keep === state.spec.keepMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function syncDiePicker() {
    $$(".die-option", dom.diePicker).forEach((button) => {
      const active = Number(button.dataset.sides) === state.spec.sides;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function syncChartModeButtons() {
    $$("button", dom.chartMode).forEach((button) => {
      const active = button.dataset.chart === state.chartMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function syncControls() {
    activeElementValue(dom.primaryCount, state.spec.count);
    dom.primaryCount.max = String(MAX_UI_DICE);
    activeElementValue(dom.keepCount, state.spec.keepCount);
    activeElementValue(dom.successTarget, state.spec.successTarget);
    activeElementValue(dom.bonusInput, state.spec.bonus);
    activeElementValue(dom.dcInput, state.dc);
    dom.explodeToggle.checked = Boolean(state.spec.explode);
    dom.formulaText.textContent = notationFor(state.mode, state.spec);
    dom.rollSummary.textContent = wordsFor(state.mode, state.spec);
    syncModeUI();
    syncKeepUI();
    syncDiePicker();
    syncChartModeButtons();
    syncExtrasValues();
    updatePresetStates();
  }

  function syncExtrasValues() {
    $$(".extra-row", dom.extraList).forEach((row, index) => {
      const extra = state.spec.extras[index];
      if (!extra) return;
      const count = $("[data-extra-count]", row);
      const select = $("[data-extra-sides]", row);
      if (count) activeElementValue(count, extra.count);
      if (select) select.value = String(extra.sides);
    });
    if (dom.addExtra) dom.addExtra.disabled = state.spec.extras.length >= MAX_EXTRAS;
  }

  function renderExtras() {
    dom.extraList.replaceChildren();
    if (!state.spec.extras.length) {
      const empty = document.createElement("p");
      empty.className = "extras-empty";
      empty.textContent = "Nenhum grupo extra. A jogada usa só os dados principais.";
      dom.extraList.append(empty);
      syncExtrasValues();
      return;
    }

    state.spec.extras.forEach((extra, index) => {
      const row = document.createElement("div");
      row.className = "extra-row";
      row.dataset.extraIndex = String(index);

      const stepper = document.createElement("div");
      stepper.className = "mini-stepper";
      stepper.innerHTML = `
        <button type="button" data-extra-step="-1" aria-label="Menos um dado extra ${index + 1} (−)">−</button>
        <input type="number" min="1" max="${MAX_UI_DICE}" value="${extra.count}" inputmode="numeric" data-extra-count aria-label="Quantidade de dados do grupo extra ${index + 1}">
        <button type="button" data-extra-step="1" aria-label="Mais um dado extra ${index + 1} (+)">+</button>`;

      const select = document.createElement("select");
      select.className = "select";
      select.dataset.extraSides = "";
      select.setAttribute("aria-label", `Tipo de dado do grupo extra ${index + 1}`);
      fillDieSelect(select);
      select.value = String(extra.sides);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-remove";
      remove.dataset.extraRemove = "";
      remove.setAttribute("aria-label", `Remover grupo extra ${index + 1} (×)`);
      remove.innerHTML = '<span aria-hidden="true" style="font-size:1.05rem;line-height:1">×</span>';

      row.append(stepper, select, remove);
      dom.extraList.append(row);
    });
    syncExtrasValues();
  }

  function syncDuelControls() {
    const fields = [
      [dom.countA, state.duel.a.count, 1, 12],
      [dom.keepCountA, state.duel.a.keepCount, 1, state.duel.a.count],
      [dom.bonusA, state.duel.a.bonus, -30, 30],
      [dom.countB, state.duel.b.count, 1, 12],
      [dom.keepCountB, state.duel.b.keepCount, 1, state.duel.b.count],
      [dom.bonusB, state.duel.b.bonus, -30, 30],
    ];
    for (const [element, value, min, max] of fields) {
      element.min = String(min);
      element.max = String(max);
      activeElementValue(element, value);
    }
    dom.dieA.value = String(state.duel.a.sides);
    dom.dieB.value = String(state.duel.b.sides);
    dom.keepA.value = state.duel.a.keepMode;
    dom.keepB.value = state.duel.b.keepMode;
    dom.keepAControl.hidden = state.duel.a.keepMode === "all";
    dom.keepBControl.hidden = state.duel.b.keepMode === "all";
  }

  function setMode(mode) {
    if (mode !== "sum" && mode !== "success") return;
    if (mode === state.mode) return;
    state.dcByMode[state.mode] = state.dc;
    state.mode = mode;
    state.dc = state.dcByMode[mode];
    clearRoll();
    commitCalc();
  }

  function applyPreset(preset) {
    state.dcByMode[state.mode] = state.dc;
    state.mode = preset.mode;
    state.spec = Object.assign(clone(DEFAULT_SPEC), clone(preset.spec));
    if (!Array.isArray(state.spec.extras)) state.spec.extras = [];
    state.dc = preset.dc;
    state.dcByMode[preset.mode] = preset.dc;
    clearRoll();
    renderExtras();
    commitCalc();
    showToast(`Jogada carregada: ${preset.title}.`);
  }

  function resetCalc() {
    state.mode = "sum";
    state.spec = clone(DEFAULT_SPEC);
    state.dc = 15;
    state.dcByMode = { sum: 15, success: 2 };
    state.chartMode = "exact";
    clearRoll();
    renderExtras();
    commitCalc();
    showToast("Calculadora limpa. Comece de novo.");
  }

  function oddsLabel(probability) {
    if (!Number.isFinite(probability) || probability <= 0.000001) return "quase impossível";
    if (probability >= 0.999999) return "quase garantido";
    if (probability >= 0.995) return "quase certo";
    if (probability <= 0.03) {
      return `≈ 1 em ${formatNumber(1 / probability, 0)}`;
    }
    const denominator = probability < 0.25 ? 40 : 20;
    let numerator = Math.max(1, Math.min(denominator - 1, Math.round(probability * denominator)));
    let divisor = 1;
    for (let candidate = 2; candidate <= numerator; candidate += 1) {
      if (numerator % candidate === 0 && denominator % candidate === 0) divisor = candidate;
    }
    numerator /= divisor;
    const finalDenominator = denominator / divisor;
    return `≈ ${numerator} em ${finalDenominator}`;
  }

  function renderProbability(analysis, probability) {
    const below = 1 - probability;
    setText(dom.probabilityValue, formatPercent(probability));
    if (state.mode === "success") {
      setHTML(dom.probabilitySentence, `de conseguir <strong>${state.dc}</strong> ou mais ${plural(state.dc, "sucesso", "sucessos")}`);
      setText(dom.probabilityDetail, `${formatPercent(below)} ficam abaixo do alvo`);
    } else {
      setHTML(dom.probabilitySentence, `de alcançar <strong>${state.dc}</strong> ou mais`);
      setText(dom.probabilityDetail, `${formatPercent(below)} ficam abaixo do alvo`);
    }
    setText(dom.oddsPill, oddsLabel(probability));
    if (analysis.entries.length === 1) {
      setText(dom.probabilityDetail, `resultado fixo em ${analysis.entries[0][0]}`);
    } else if (probability >= 0.999999) {
      setText(dom.probabilityDetail, "todo resultado possível alcança o alvo");
    } else if (probability <= 0.000001) {
      setText(dom.probabilityDetail, "o alvo está fora do alcance possível");
    }
  }

  function joinModes(values) {
    if (values.length === 1) return String(values[0]);
    if (values.length === 2) return `${values[0]} e ${values[1]}`;
    return `${values.slice(0, -1).join(", ")} e ${values[values.length - 1]}`;
  }

  function renderStats(analysis) {
    const modes = analysis.modeValues;
    const contiguous = modes.length > 1 && modes[modes.length - 1] - modes[0] + 1 === modes.length;
    let modeText;
    if (modes.length === 1) modeText = String(modes[0]);
    else if (contiguous && modes.length > 4) modeText = `${modes[0]}–${modes[modes.length - 1]}`;
    else if (modes.length <= 4) modeText = joinModes(modes);
    else modeText = `${modes[0]} … ${modes[modes.length - 1]}`;

    setText(dom.statMean, formatNumber(analysis.mean, 1));
    setText(dom.statMeanSub, state.mode === "success" ? "sucessos esperados" : "centro da distribuição");
    setText(dom.statMode, modeText);
    if (modes.length === 1) {
      setText(dom.statModeSub, `chance de ${formatPercent(analysis.modeProbability)}`);
    } else if (contiguous && modes.length > 4) {
      setText(dom.statModeSub, `cada um com ${formatPercent(analysis.modeProbability)}`);
    } else {
      setText(dom.statModeSub, `${modes.length} valores empatados em ${formatPercent(analysis.modeProbability)}`);
    }
    setText(dom.statRange, `${analysis.q25}–${analysis.q75}`);
    setText(dom.statRangeSub, "metade central das rolagens");
    setText(dom.statSd, formatNumber(analysis.sd, 1));
    setText(dom.statSdSub, state.mode === "success" ? "variação dos sucessos" : "quanto os resultados abrem");
  }

  function renderTable(analysis) {
    if (dom.tablePanel.hidden) return;
    const entries = analysis.entries;
    const tails = new Array(entries.length);
    let running = 0;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      running += entries[index][1];
      tails[index] = running;
    }
    const fragment = document.createDocumentFragment();
    entries.forEach(([value, probability], index) => {
      const row = document.createElement("tr");
      if (value === state.dc) {
        row.className = "is-target";
        row.setAttribute("aria-current", "true");
      }
      const valueCell = document.createElement("td");
      valueCell.textContent = String(value);
      const exactCell = document.createElement("td");
      exactCell.textContent = formatPercentSmart(probability);
      const tailCell = document.createElement("td");
      tailCell.textContent = formatPercentSmart(tails[index]);
      row.append(valueCell, exactCell, tailCell);
      fragment.append(row);
    });
    dom.distributionTable.replaceChildren(fragment);
    setText(dom.tableCount, `${entries.length} ${plural(entries.length, "resultado", "resultados")}`);
  }

  function renderExplanation(analysis, probability) {
    let text = wordsFor(state.mode, state.spec);
    if (state.mode === "success") {
      text += ` O número de sucessos vai de ${analysis.min} a ${analysis.max}, com média ${formatNumber(analysis.mean, 1)}.`;
    } else {
      text += ` O total vai de ${analysis.min} a ${analysis.max}, com média ${formatNumber(analysis.mean, 1)}.`;
    }
    if (analysis.min === analysis.max) {
      text += " Só existe um resultado possível.";
    } else {
      text += ` Metade das rolagens fica entre ${analysis.q25} e ${analysis.q75}.`;
    }
    if (state.mode === "success") {
      text += ` Para conseguir ${state.dc} ou mais sucessos, a chance é ${formatPercent(probability)}.`;
    } else {
      text += ` Para alcançar ${state.dc} ou mais, a chance é ${formatPercent(probability)}.`;
    }
    if (probability > 0.002 && probability < 0.998) {
      const three = 1 - Math.pow(1 - probability, 3);
      text += ` Em três tentativas independentes, pelo menos uma alcança o alvo em ${formatPercent(three)} dos casos.`;
    }
    setText(dom.plainExplanation, text);
  }

  function chartNoteFor(analysis) {
    const count = analysis.entries.length;
    return `${count} ${plural(count, "valor possível", "valores possíveis")} · faixa ${analysis.min}–${analysis.max}`;
  }

  function drawCalcChart(analysis) {
    if (!calcChart) return;
    calcChart.render({
      entries: analysis.entries,
      target: state.dc,
      mode: state.chartMode,
      title: state.mode === "success" ? "Distribuição de sucessos" : "Distribuição dos resultados",
      valueName: state.mode === "success" ? "Sucessos" : "Resultado",
      targetPrefix: "alvo ",
    });
  }

  function updateResults() {
    const distribution = computeCurrentDistribution();
    const analysis = Engine.analyze(distribution);
    const probability = Engine.probabilityAtLeast(distribution, state.dc);
    state.lastCalc = analysis;

    renderProbability(analysis, probability);
    renderStats(analysis);
    renderExplanation(analysis, probability);
    setText(dom.chartNote, chartNoteFor(analysis));
    setText(dom.chartHint, state.chartMode === "atleast"
      ? "A altura é a chance de alcançar aquele valor ou mais. Clique para mirar."
      : "Cada coluna é a chance de cair exatamente no valor. Clique para mirar.");
    drawCalcChart(analysis);
    if (!dom.tablePanel.hidden) renderTable(analysis);
    saveState();
  }

  function commitCalc() {
    clearRoll();
    sanitizeState();
    syncControls();
    updateResults();
  }

  function scheduleCalcCommit() {
    clearTimeout(calcCommitTimer);
    calcCommitTimer = window.setTimeout(commitCalc, 90);
  }

  function clearRoll() {
    rollToken += 1;
    clearInterval(rollTimer);
    stopSfx();
    if (dom.rollResult) {
      dom.rollResult.hidden = true;
      dom.rollResult.replaceChildren();
      dom.rollResult.setAttribute("aria-live", "polite");
      dom.rollResult.removeAttribute("aria-label");
    }
    dom.rollButton.disabled = false;
    dom.rollButtonLabel.textContent = "Rolar na mesa";
  }

  function duelSideSpec(side) {
    return {
      primary: { count: side.count, sides: side.sides },
      extras: [],
      keep: { mode: side.keepMode, count: side.keepMode === "all" ? side.count : side.keepCount },
      explode: false,
      bonus: side.bonus,
    };
  }

  function duelSideNotation(side) {
    return notationFor("sum", {
      count: side.count,
      sides: side.sides,
      keepMode: side.keepMode,
      keepCount: side.keepCount,
      explode: false,
      bonus: side.bonus,
      extras: [],
    });
  }

  function renderDuel() {
    const distributionA = Engine.computeSum(duelSideSpec(state.duel.a));
    const distributionB = Engine.computeSum(duelSideSpec(state.duel.b));
    const analysisA = Engine.analyze(distributionA);
    const analysisB = Engine.analyze(distributionB);
    const comparison = Engine.compareDistributions(distributionA, distributionB);
    const margin = Engine.analyze(comparison.margin);
    state.lastDuel = { comparison, margin, analysisA, analysisB };

    setText(dom.duelFormulaA, duelSideNotation(state.duel.a));
    setText(dom.duelFormulaB, duelSideNotation(state.duel.b));
    setText(dom.duelMetaA, `média ${formatNumber(analysisA.mean, 1)} · faixa ${analysisA.min}–${analysisA.max}`);
    setText(dom.duelMetaB, `média ${formatNumber(analysisB.mean, 1)} · faixa ${analysisB.min}–${analysisB.max}`);

    const aWins = comparison.winFirst >= comparison.winSecond;
    const winner = aWins ? "A" : "B";
    const winnerRate = aWins ? comparison.winFirst : comparison.winSecond;
    setText(dom.duelWinner, winner);
    setText(dom.duelWinRate, formatPercent(winnerRate));

    const difference = Math.abs(comparison.winFirst - comparison.winSecond);
    let verdict = `O empate aparece em ${formatPercent(comparison.tie)} dos casos.`;
    if (difference < 0.02) verdict += " É praticamente um empate técnico.";
    else if (Math.abs(margin.mean) < 0.05) verdict += " A margem média fica em zero.";
    else verdict += ` A margem média é ${formatSigned(margin.mean)} a favor de ${margin.mean > 0 ? "A" : "B"}.`;
    setText(dom.duelVerdictDetail, verdict);

    dom.duelBarA.style.width = `${comparison.winFirst * 100}%`;
    dom.duelBarTie.style.width = `${comparison.tie * 100}%`;
    dom.duelBarB.style.width = `${comparison.winSecond * 100}%`;
    dom.duelSplit.setAttribute(
      "aria-label",
      `A vence ${formatPercent(comparison.winFirst)}, empate ${formatPercent(comparison.tie)}, B vence ${formatPercent(comparison.winSecond)}`
    );

    setText(dom.duelStatA, formatPercent(comparison.winFirst));
    setText(dom.duelStatTie, formatPercent(comparison.tie));
    setText(dom.duelStatB, formatPercent(comparison.winSecond));
    setText(dom.duelStatMargin, formatSigned(margin.mean));

    const marginValues = margin.entries.length;
    setText(
      dom.duelChartNote,
      `${marginValues} ${plural(marginValues, "margem possível", "margens possíveis")} · pico em ${formatSigned(margin.mode)}`
    );
    const favorite = comparison.winFirst > comparison.winSecond
      ? "A"
      : comparison.winSecond > comparison.winFirst
        ? "B"
        : "ninguém";
    const aRounded = formatPercent(comparison.winFirst);
    const bRounded = formatPercent(comparison.winSecond);
    const tRounded = formatPercent(comparison.tie);
    let explain = `A vence em ${aRounded} dos confrontos, B vence em ${bRounded} e ${tRounded} terminam empatados.`;
    if (favorite !== "ninguém") {
      explain += ` O favorito é o lado <strong>${favorite}</strong>.`;
    } else {
      explain += " Os dois lados têm exatamente a mesma chance de vitória.";
    }
    if (margin.mean > 0.05) explain += ` Em média, A supera B por ${formatNumber(margin.mean, 1)} ${plural(Math.round(margin.mean), "ponto", "pontos")}.`;
    if (margin.mean < -0.05) explain += ` Em média, B supera A por ${formatNumber(Math.abs(margin.mean), 1)} ${plural(Math.round(Math.abs(margin.mean)), "ponto", "pontos")}.`;
    explain += ` A margem mais comum é ${formatSigned(margin.mode)}.`;
    setHTML(dom.duelExplain, explain);

    saveState();
    if (state.view === "duel") requestAnimationFrame(() => drawDuelChart());
  }

  function drawDuelChart() {
    if (!duelChart || !state.lastDuel) return;
    const margin = state.lastDuel.margin;
    duelChart.render({
      entries: margin.entries,
      target: 0,
      mode: "margin",
      title: "Distribuição da margem entre os lados A e B",
      valueName: "Margem",
      targetPrefix: "",
    });
  }

  function commitDuel() {
    sanitizeState();
    syncDuelControls();
    renderDuel();
  }

  function scheduleDuelCommit() {
    clearTimeout(duelCommitTimer);
    duelCommitTimer = window.setTimeout(commitDuel, 90);
  }

  function dieChip(die, mode) {
    const chip = document.createElement("span");
    chip.className = "rolled-die";
    if (!die.kept) chip.classList.add("is-dropped");
    if (die.exploded) chip.classList.add("is-exploded");
    if (mode === "success" && die.successes > 0) chip.classList.add("is-success");
    chip.textContent = String(die.total);
    chip.title = die.faces.length > 1
      ? `Faces: ${die.faces.join(" + ")} = ${die.total}`
      : `Face: ${die.faces[0]}`;
    if (die.exploded) {
      const extra = document.createElement("span");
      extra.className = "die-extra";
      extra.textContent = mode === "success" ? `${die.successes}✓` : `+${die.extra}`;
      chip.append(extra);
    }
    return chip;
  }

  function rollGroup(label, dice, mode) {
    const group = document.createElement("div");
    group.className = "roll-group";
    const groupLabel = document.createElement("span");
    groupLabel.className = "roll-group-label";
    groupLabel.textContent = label;
    const diceWrap = document.createElement("span");
    diceWrap.style.display = "inline-flex";
    diceWrap.style.flexWrap = "wrap";
    diceWrap.style.gap = "5px";
    for (const die of dice) diceWrap.append(dieChip(die, mode));
    group.append(groupLabel, diceWrap);
    return group;
  }

  function buildRollCard(result) {
    const mode = result.mode;
    const passed = result.total >= state.dc;
    const fragment = document.createDocumentFragment();

    const head = document.createElement("div");
    head.className = "roll-result-head";
    const eyebrow = document.createElement("span");
    eyebrow.className = "roll-eyebrow";
    eyebrow.textContent = "Rolagem de verdade";
    const total = document.createElement("strong");
    total.className = "roll-total";
    total.textContent = String(result.total);
    const badge = document.createElement("span");
    badge.className = `roll-badge ${passed ? "is-success" : "is-failure"}`;
    badge.textContent = passed
      ? (mode === "success" ? "sucesso" : "passa")
      : (mode === "success" ? "falha" : "fica abaixo");
    head.append(eyebrow, total, badge);
    fragment.append(head);

    const groups = document.createElement("div");
    groups.className = "roll-groups";
    if (mode === "sum") {
      const keepLabel = state.spec.keepMode === "all"
        ? ""
        : state.spec.keepMode === "high"
          ? ` · melhores ${state.spec.keepCount}`
          : ` · menores ${state.spec.keepCount}`;
      groups.append(rollGroup(`${diceText(state.spec.count, state.spec.sides)}${keepLabel}`, result.primaryDice, mode));
      result.extraGroups.forEach((entry, index) => {
        groups.append(rollGroup(`extra ${index + 1} · ${diceText(entry.group.count, entry.group.sides)}`, entry.dice, mode));
      });
    } else {
      result.groups.forEach((entry, index) => {
        groups.append(rollGroup(index === 0
          ? diceText(entry.group.count, entry.group.sides)
          : `extra ${index} · ${diceText(entry.group.count, entry.group.sides)}`, entry.dice, mode));
      });
    }
    fragment.append(groups);

    const breakdown = document.createElement("p");
    breakdown.className = "roll-breakdown";
    if (mode === "sum") {
      const kept = result.primaryDice.filter((die) => die.kept).map((die) => die.total);
      result.extraGroups.forEach((entry) => {
        entry.dice.forEach((die) => kept.push(die.total));
      });
      const dropped = result.primaryDice.length - result.primaryDice.filter((die) => die.kept).length;
      const diceTotal = kept.reduce((sum, value) => sum + value, 0);
      let text = `Dados: ${kept.length ? kept.join(" + ") : "0"} = ${diceTotal}`;
      if (state.spec.bonus) text += ` · bônus ${formatSigned(state.spec.bonus)}`;
      text += ` · total ${result.total} · alvo ${state.dc}.`;
      if (dropped) text += ` ${dropped} ${plural(dropped, "dado descartado", "dados descartados")}.`;
      breakdown.textContent = text;
    } else {
      breakdown.textContent = `Cada face ${state.spec.successTarget}+ conta 1 sucesso. Total ${result.total} ${plural(result.total, "sucesso", "sucessos")} · alvo ${state.dc}.`;
    }
    fragment.append(breakdown);
    return fragment;
  }

  function randomCurrentRoll() {
    return state.mode === "success" ? Engine.rollSuccess(engineSpec()) : Engine.rollSum(engineSpec());
  }

  function paintRoll(result) {
    dom.rollResult.replaceChildren(buildRollCard(result));
    dom.rollResult.hidden = false;
  }

  /* ------------------------------------------------------------------------
     Som da rolagem — sintetizado no navegador, sem arquivos de áudio.
     ------------------------------------------------------------------------ */

  function readSoundPreference() {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch (error) {
      return true;
    }
  }

  function applySound(enabled, options = {}) {
    soundEnabled = Boolean(enabled);
    if (dom.soundToggle) {
      dom.soundToggle.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
      dom.soundToggle.title = soundEnabled ? "Desativar som da rolagem" : "Ativar som da rolagem";
    }
    if (dom.soundToggleLabel) {
      dom.soundToggleLabel.textContent = soundEnabled ? "Som ligado" : "Som desligado";
    }
    if (options.persist !== false) {
      try {
        localStorage.setItem(SOUND_KEY, soundEnabled ? "on" : "off");
      } catch (error) {
        /* armazenamento bloqueado; o ajuste vale só nesta sessão */
      }
    }
    if (!soundEnabled) stopSfx();
    else if (options.preview) playDiceTick(1, 3);
  }

  function ensureAudioContext() {
    if (!soundEnabled) return null;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext || audioContext.state === "closed") {
      try {
        audioContext = new AudioCtor();
        audioMaster = audioContext.createGain();
        audioMaster.gain.value = 0.65;
        audioMaster.connect(audioContext.destination);
        audioNoise = null;
      } catch (error) {
        audioContext = null;
        audioMaster = null;
        return null;
      }
    }
    return audioContext;
  }

  function stopSfx() {
    for (const node of activeSfx) {
      try {
        node.stop();
      } catch (error) {
        /* o nó já terminou */
      }
    }
    activeSfx.clear();
  }

  function noiseBuffer(ctx) {
    if (audioNoise && audioNoise.sampleRate === ctx.sampleRate) return audioNoise;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * 0.12));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
    audioNoise = buffer;
    return buffer;
  }

  function connectSfx(ctx, node, pan, when) {
    if (!audioMaster) return;
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), when);
      node.connect(panner);
      panner.connect(audioMaster);
    } else {
      node.connect(audioMaster);
    }
  }

  function playClack(ctx, when, { freq = 1800, gain = 0.07, duration = 0.05, pan = 0 } = {}) {
    if (!audioMaster) return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, when);
    filter.Q.setValueAtTime(1.1, when);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), when + 0.003);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(envelope);
    connectSfx(ctx, envelope, pan, when);
    source.start(when);
    source.stop(when + duration + 0.02);
    activeSfx.add(source);
    source.onended = () => activeSfx.delete(source);
  }

  function playThud(ctx, when, { freq = 145, gain = 0.11, duration = 0.12, pan = 0 } = {}) {
    if (!audioMaster) return;
    const oscillator = ctx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(freq, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(55, freq * 0.55), when + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), when + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(envelope);
    connectSfx(ctx, envelope, pan, when);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.03);
    activeSfx.add(oscillator);
    oscillator.onended = () => activeSfx.delete(oscillator);
  }

  function playDiceTick(index, total) {
    if (!soundEnabled) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const run = () => {
      try {
        if (!soundEnabled || ctx.state === "closed") return;
        const when = ctx.currentTime + 0.008;
        const pan = () => Math.random() * 1.1 - 0.55;
        if (index >= total - 1) {
          playClack(ctx, when, { freq: 1050, gain: 0.11, duration: 0.075, pan: 0 });
          playThud(ctx, when + 0.008, { freq: 145, gain: 0.11, duration: 0.12, pan: 0 });
          playClack(ctx, when + 0.045, { freq: 1750, gain: 0.035, duration: 0.04, pan: pan() });
        } else {
          playClack(ctx, when, {
            freq: 1450 + Math.random() * 1200,
            gain: 0.045 + Math.random() * 0.03,
            duration: 0.035 + Math.random() * 0.02,
            pan: pan(),
          });
          if (Math.random() < 0.55) {
            playClack(ctx, when + 0.012 + Math.random() * 0.02, {
              freq: 1500 + Math.random() * 1400,
              gain: 0.028 + Math.random() * 0.02,
              duration: 0.028 + Math.random() * 0.014,
              pan: pan(),
            });
          }
        }
      } catch (error) {
        /* áudio indisponível; a rolagem segue normalmente */
      }
    };
    if (ctx.state === "running") run();
    else ctx.resume().then(run).catch(() => {});
  }

  function rollActual() {
    const token = ++rollToken;
    clearInterval(rollTimer);
    stopSfx();
    const totalTicks = 9;
    dom.rollButton.disabled = true;
    dom.rollButtonLabel.textContent = "Rolando…";
    dom.rollResult.setAttribute("aria-live", "off");
    paintRoll(randomCurrentRoll());
    playDiceTick(0, totalTicks);
    let frames = 0;

    rollTimer = window.setInterval(() => {
      if (token !== rollToken) {
        clearInterval(rollTimer);
        return;
      }
      frames += 1;
      if (frames >= 8) {
        clearInterval(rollTimer);
        const finalResult = randomCurrentRoll();
        paintRoll(finalResult);
        playDiceTick(8, totalTicks);
        dom.rollButton.disabled = false;
        dom.rollButtonLabel.textContent = "Rolar de novo";
        dom.rollResult.setAttribute("aria-live", "polite");
        const status = finalResult.total >= state.dc ? "alcança o alvo" : "fica abaixo do alvo";
        dom.rollResult.setAttribute("aria-label", `Rolagem final: ${finalResult.total}, ${status}.`);
      } else {
        paintRoll(randomCurrentRoll());
        playDiceTick(frames, totalTicks);
      }
    }, 65);
  }

  function copyText(text) {
    const fallback = () => {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.append(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        return copied;
      } catch (error) {
        return false;
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(fallback);
    }
    return Promise.resolve(fallback());
  }

  function setDc(value) {
    state.dc = clampInt(value, -50, 1000, state.dc);
    state.dcByMode[state.mode] = state.dc;
    commitCalc();
  }

  function setView(view, options = {}) {
    const isDuel = view === "duel";
    state.view = isDuel ? "duel" : "calc";
    dom.body.classList.toggle("is-duel", isDuel);
    dom.calcView.hidden = isDuel;
    dom.duelView.hidden = !isDuel;

    $$(".main-nav [data-view-link]").forEach((link) => {
      const active = link.dataset.viewLink === state.view;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    if (isDuel) {
      renderDuel();
      requestAnimationFrame(() => drawDuelChart());
      if (options.scroll) dom.duelView.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      requestAnimationFrame(() => {
        if (state.lastCalc) drawCalcChart(state.lastCalc);
        if (options.scroll) dom.calcView.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch (error) {
      /* ignora bloqueio de armazenamento */
    }
    if (dom.themeMeta) dom.themeMeta.setAttribute("content", dark ? "#0f1714" : "#f4efe5");
    dom.themeToggle.setAttribute("aria-label", dark ? "Ativar tema claro" : "Ativar tema escuro");
    dom.themeToggle.setAttribute("title", dark ? "Ativar tema claro" : "Ativar tema escuro");
  }

  function scheduleCharts() {
    cancelAnimationFrame(chartFrame);
    chartFrame = requestAnimationFrame(() => {
      if (state.view === "calc" && state.lastCalc) drawCalcChart(state.lastCalc);
      if (state.view === "duel" && state.lastDuel) drawDuelChart();
    });
  }

  function bindEvents() {
    dom.modeTabs.forEach((tab) => {
      tab.addEventListener("click", () => setMode(tab.dataset.mode));
    });

    dom.keepMode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-keep]");
      if (!button) return;
      state.spec.keepMode = button.dataset.keep;
      if (state.spec.keepCount > state.spec.count) state.spec.keepCount = state.spec.count;
      commitCalc();
    });

    $$("[data-step]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.target;
        const delta = toInt(button.dataset.step, 1);
        if (target === "primaryCount") {
          state.spec.count = clamp(state.spec.count + delta, 1, MAX_UI_DICE);
          if (state.spec.keepMode !== "all") {
            state.spec.keepCount = clamp(state.spec.keepCount, 1, state.spec.count);
          }
        } else if (target === "keepCount") {
          state.spec.keepCount = clamp(state.spec.keepCount + delta, 1, state.spec.count);
        } else if (target === "successTarget") {
          state.spec.successTarget = clamp(state.spec.successTarget + delta, 1, 100);
        } else if (target === "bonus") {
          state.spec.bonus = clamp(state.spec.bonus + delta, -50, 50);
        } else if (target === "dc") {
          state.dc = clamp(state.dc + delta, -50, 1000);
          state.dcByMode[state.mode] = state.dc;
        }
        commitCalc();
      });
    });

    function bindNumberInput(element, apply) {
      element.addEventListener("input", () => {
        const raw = element.value.trim();
        if (!raw || raw === "-") return;
        const number = Number(raw);
        if (!Number.isFinite(number)) return;
        apply(number);
        scheduleCalcCommit();
      });
      element.addEventListener("change", commitCalc);
      element.addEventListener("blur", commitCalc);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitCalc();
          element.blur();
        }
      });
    }

    bindNumberInput(dom.primaryCount, (value) => {
      state.spec.count = clampInt(value, 1, MAX_UI_DICE, state.spec.count);
      if (state.spec.keepMode !== "all") {
        state.spec.keepCount = clamp(state.spec.keepCount, 1, state.spec.count);
      }
    });
    bindNumberInput(dom.keepCount, (value) => {
      state.spec.keepCount = clampInt(value, 1, state.spec.count, state.spec.keepCount);
    });
    bindNumberInput(dom.successTarget, (value) => {
      state.spec.successTarget = clampInt(value, 1, 100, state.spec.successTarget);
    });
    bindNumberInput(dom.bonusInput, (value) => {
      state.spec.bonus = clampInt(value, -50, 50, state.spec.bonus);
    });
    bindNumberInput(dom.dcInput, (value) => {
      state.dc = clampInt(value, -50, 1000, state.dc);
      state.dcByMode[state.mode] = state.dc;
    });

    dom.explodeToggle.addEventListener("change", () => {
      state.spec.explode = dom.explodeToggle.checked;
      commitCalc();
    });

    dom.addExtra.addEventListener("click", () => {
      if (state.spec.extras.length >= MAX_EXTRAS) {
        showToast(`Limite de ${MAX_EXTRAS} grupos extras.`);
        return;
      }
      state.spec.extras.push({ count: 1, sides: 6 });
      renderExtras();
      commitCalc();
    });

    dom.extraList.addEventListener("click", (event) => {
      const row = event.target.closest(".extra-row");
      if (!row) return;
      const index = toInt(row.dataset.extraIndex, -1);
      const extra = state.spec.extras[index];
      if (!extra) return;

      const remove = event.target.closest("[data-extra-remove]");
      if (remove) {
        state.spec.extras.splice(index, 1);
        renderExtras();
        commitCalc();
        return;
      }
      const step = event.target.closest("[data-extra-step]");
      if (step) {
        extra.count = clamp(extra.count + toInt(step.dataset.extraStep, 0), 1, MAX_UI_DICE);
        commitCalc();
      }
    });

    dom.extraList.addEventListener("input", (event) => {
      const input = event.target.closest("[data-extra-count]");
      if (!input) return;
      const row = input.closest(".extra-row");
      const extra = state.spec.extras[toInt(row.dataset.extraIndex, -1)];
      if (!extra) return;
      const raw = input.value.trim();
      if (!raw) return;
      const number = Number(raw);
      if (!Number.isFinite(number)) return;
      extra.count = clampInt(number, 1, MAX_UI_DICE, extra.count);
      scheduleCalcCommit();
    });

    dom.extraList.addEventListener("change", (event) => {
      const select = event.target.closest("[data-extra-sides]");
      if (!select) return;
      const row = select.closest(".extra-row");
      const extra = state.spec.extras[toInt(row.dataset.extraIndex, -1)];
      if (!extra) return;
      extra.sides = allowedSides(select.value);
      commitCalc();
    });

    dom.extraList.addEventListener("focusout", (event) => {
      if (event.target.matches("[data-extra-count]")) commitCalc();
    });

    dom.copyFormula.addEventListener("click", () => {
      copyText(dom.formulaText.textContent).then((copied) => {
        showToast(copied ? "Notação copiada." : "Não foi possível copiar a notação.");
      });
    });

    dom.resetButton.addEventListener("click", resetCalc);
    dom.rollButton.addEventListener("click", rollActual);

    if (dom.soundToggle) {
      dom.soundToggle.addEventListener("click", () => {
        const next = !soundEnabled;
        applySound(next, { preview: next });
      });
    }

    dom.chartMode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-chart]");
      if (!button) return;
      state.chartMode = button.dataset.chart === "atleast" ? "atleast" : "exact";
      syncChartModeButtons();
      updateResults();
    });

    dom.tableToggle.addEventListener("click", () => {
      const open = dom.tablePanel.hidden;
      dom.tablePanel.hidden = !open;
      dom.tableToggle.setAttribute("aria-expanded", open ? "true" : "false");
      state.tableOpen = open;
      const textNode = [...dom.tableToggle.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
      if (textNode) textNode.nodeValue = open ? "\n                  Ocultar tabela\n                  " : "\n                  Ver tabela completa\n                  ";
      if (open && state.lastCalc) renderTable(state.lastCalc);
    });

    dom.duelView.addEventListener("click", (event) => {
      const button = event.target.closest("[data-duel-step]");
      if (!button) return;
      const field = button.dataset.field;
      const sideKey = field.endsWith("B") ? "b" : "a";
      const fieldName = field.slice(0, -1);
      const side = state.duel[sideKey];
      const delta = toInt(button.dataset.duelStep, 0);
      if (fieldName === "count") {
        side.count = clamp(side.count + delta, 1, 12);
        side.keepCount = clamp(side.keepCount, 1, side.count);
      } else if (fieldName === "keepCount") {
        side.keepCount = clamp(side.keepCount + delta, 1, side.count);
      } else if (fieldName === "bonus") {
        side.bonus = clamp(side.bonus + delta, -30, 30);
      }
      commitDuel();
    });

    const duelNumberInputs = [
      [dom.countA, "a", "count", 1, 12],
      [dom.keepCountA, "a", "keepCount", 1, 12],
      [dom.bonusA, "a", "bonus", -30, 30],
      [dom.countB, "b", "count", 1, 12],
      [dom.keepCountB, "b", "keepCount", 1, 12],
      [dom.bonusB, "b", "bonus", -30, 30],
    ];
    duelNumberInputs.forEach(([element, sideKey, field, min, max]) => {
      element.addEventListener("input", () => {
        const raw = element.value.trim();
        if (!raw || raw === "-") return;
        const number = Number(raw);
        if (!Number.isFinite(number)) return;
        const side = state.duel[sideKey];
        side[field] = clampInt(number, min, max, side[field]);
        if (field === "count") side.keepCount = clamp(side.keepCount, 1, side.count);
        scheduleDuelCommit();
      });
      element.addEventListener("change", commitDuel);
      element.addEventListener("blur", commitDuel);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitDuel();
          element.blur();
        }
      });
    });

    dom.keepA.addEventListener("change", () => {
      state.duel.a.keepMode = dom.keepA.value;
      commitDuel();
    });
    dom.keepB.addEventListener("change", () => {
      state.duel.b.keepMode = dom.keepB.value;
      commitDuel();
    });
    dom.dieA.addEventListener("change", () => {
      state.duel.a.sides = allowedSides(dom.dieA.value);
      commitDuel();
    });
    dom.dieB.addEventListener("change", () => {
      state.duel.b.sides = allowedSides(dom.dieB.value);
      commitDuel();
    });

    dom.swapDuel.addEventListener("click", () => {
      const first = state.duel.a;
      state.duel.a = state.duel.b;
      state.duel.b = first;
      commitDuel();
      showToast("Lados trocados.");
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-view-link]");
      if (!link) return;
      event.preventDefault();
      const view = link.dataset.viewLink === "duel" ? "duel" : "calc";
      const brand = Boolean(link.closest(".brand"));
      setView(view, { scroll: !brand });
      if (brand) window.scrollTo({ top: 0, behavior: "smooth" });
    });

    dom.themeToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });

    dom.shareButton.addEventListener("click", () => {
      const url = buildShareUrl();
      try {
        history.replaceState(null, "", state.view === "duel" ? buildDuelHash() : buildCalcHash());
      } catch (error) {
        /* alguns navegadores bloqueiam replaceState em arquivos locais */
      }
      copyText(url).then((copied) => {
        showToast(copied
          ? "Link copiado. Ele guarda apenas a configuração da jogada."
          : "Não foi possível copiar. O link está na barra de endereço.");
      });
    });

    window.addEventListener("hashchange", () => {
      if (!/^#(calc|duel)\?/.test(location.hash)) return;
      restoreFromHash();
      sanitizeState();
      renderExtras();
      syncDuelControls();
      syncControls();
      commitCalc();
      syncDuelControls();
      setView(state.view, { scroll: false });
      if (state.view === "duel") renderDuel();
      showToast("Configuração carregada pelo link.");
    });

    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(scheduleCharts);
      observer.observe(dom.chart.parentElement);
      observer.observe(dom.duelChart.parentElement);
    } else {
      window.addEventListener("resize", scheduleCharts);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleCharts).catch(() => {});
    }
  }

  function init() {
    restoreState();
    sanitizeState();
    buildDiePicker();
    buildPresets();
    buildDuelControls();
    renderExtras();
    syncDuelControls();
    applyTheme(document.documentElement.dataset.theme || "light");
    applySound(readSoundPreference(), { persist: false });

    calcChart = createChart({
      svg: dom.chart,
      tooltip: dom.chartTooltip,
      a11y: dom.chartA11y,
      kind: "calc",
      onSelect: setDc,
    });
    duelChart = createChart({
      svg: dom.duelChart,
      tooltip: dom.duelTooltip,
      a11y: null,
      kind: "duel",
      onSelect: null,
    });

    bindEvents();
    syncControls();
    commitCalc();
    renderDuel();
    syncDuelControls();
    setView(state.view, { scroll: false });
    if (state.view === "duel") {
      renderDuel();
      syncDuelControls();
    }
    requestAnimationFrame(scheduleCharts);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
