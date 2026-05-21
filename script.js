// ============================================
//  GREEN MSME SIMULATOR — SCRIPT.JS
//  Web Technology Project · Dept of Data Science
//  (Minor: Economics)
// ============================================

const SUSTAIN_CONFIG = {
  low:    { costMult: 1.08, growthBonus: 0.00, label: "🏭 Non-Green (Low)" },
  medium: { costMult: 1.00, growthBonus: 0.04, label: "🌿 Semi-Green (Medium)" },
  high:   { costMult: 0.90, growthBonus: 0.09, label: "🌍 Fully Green (High)" },
};

const SCENARIO_DEFS = {
  inflation: { label: "🔴 High Inflation (8%)",  icon: "🔴", colorClass: "red",     changes: { inflation: 8.0 },                              desc: "High-inflation regime — RBI yet to intervene" },
  lowrate:   { label: "🟢 Low Repo Rate (4%)",    icon: "🟢", colorClass: "green-c", changes: { rbi_rate: 4.0 },                               desc: "RBI accommodative stance to stimulate growth" },
  green:     { label: "🌿 Full Green Adoption",   icon: "🌿", colorClass: "teal",    changes: { sustainability: "high" },                      desc: "Full eco-cert: 10% cost cut + 9%/yr compounding" },
  crisis:    { label: "⚠️ Crisis — Recession",    icon: "⚠️", colorClass: "amber",   changes: { inflation: 10.0, rbi_rate: 9.0, cost_pct: 80 }, desc: "Stagflation: high inflation, tight credit, squeezed margins" },
};

var activeScenarios = {};
var chartInstances  = {};
var lastInputs      = {};

// ── UTILITIES ───────────────────────────────────────────────────
function fmt(n) {
  if (isNaN(n)) return "—";
  var abs = Math.abs(n), sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return sign + "₹" + (abs / 1e7).toFixed(2) + " Cr";
  if (abs >= 1e5) return sign + "₹" + (abs / 1e5).toFixed(2) + " L";
  return sign + "₹" + abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function pct(n)          { return isNaN(n) ? "—" : n.toFixed(1) + "%"; }
function clamp(v, mn, mx){ return Math.min(Math.max(v, mn), mx); }

function animateBar(id, w, delay) {
  setTimeout(function () {
    var el = document.getElementById(id);
    if (el) el.style.width = clamp(w, 0, 100) + "%";
  }, delay || 0);
}

// ── CORE CALCULATOR ─────────────────────────────────────────────
function calcMSME(inv, rev, rbi, inf, cost, sustain) {
  var cfg   = SUSTAIN_CONFIG[sustain];
  var R     = rev * 12;
  var adjC  = cost * cfg.costMult;
  var C     = R * (adjC / 100);
  var L     = inv * 0.40;
  var IC    = L * (rbi / 100);
  var GP    = R - C;
  var IE    = GP * (inf / 100) * 0.5;
  var net   = GP - IC - IE;
  var margin = R > 0 ? (net / R) * 100 : 0;

  function fy(sl) {
    var cf  = SUSTAIN_CONFIG[sl];
    var ac2 = cost * cf.costMult;
    var gp2 = R * (1 - ac2 / 100);
    var ie2 = gp2 * (inf / 100) * 0.5;
    var an2 = gp2 - IC - ie2;
    var tot = 0;
    for (var yr = 1; yr <= 5; yr++) tot += an2 * Math.pow(1 + cf.growthBonus, yr);
    return tot;
  }

  var profitScore  = clamp((margin / 25) * 35, 0, 35);
  var sustainScore = { low: 0, medium: 15, high: 25 }[sustain];
  var policyScore  = clamp(((10 - rbi)  / 10) * 20, 0, 20);
  var inflScore    = clamp(((15 - inf)   / 15) * 20, 0, 20);
  var fhs = Math.round(profitScore + sustainScore + policyScore + inflScore);

  return {
    R: R, C: C, IC: IC, IE: IE, GP: GP, net: net, margin: margin,
    fy_low: fy("low"), fy_med: fy("medium"), fy_high: fy("high"), fy_sel: fy(sustain),
    fhs: fhs, sustain: sustain,
  };
}

function getInputs() {
  return {
    inv:     parseFloat(document.getElementById("investment").value)   || 0,
    rev:     parseFloat(document.getElementById("revenue").value)      || 0,
    rbi:     parseFloat(document.getElementById("rbi_rate").value)     || 0,
    inf:     parseFloat(document.getElementById("inflation").value)    || 0,
    cost:    parseFloat(document.getElementById("cost_pct").value)     || 0,
    sustain: document.getElementById("sustainability").value,
  };
}

// ── MAIN SIMULATION ─────────────────────────────────────────────
function runSimulation() {
  var b = getInputs();
  lastInputs = b;
  var r = calcMSME(b.inv, b.rev, b.rbi, b.inf, b.cost, b.sustain);

  // Module 2 — Profit
  document.getElementById("pr-annual-rev").textContent = fmt(r.R);
  document.getElementById("pr-cost").textContent       = "−" + fmt(r.C);
  document.getElementById("pr-interest").textContent   = "−" + fmt(r.IC);
  document.getElementById("pr-inflation").textContent  = "−" + fmt(r.IE);
  var netEl = document.getElementById("pr-net");
  netEl.textContent = fmt(r.net);
  netEl.style.color = r.net >= 0 ? "#3a7a3a" : "#e05252";
  var mEl = document.getElementById("pr-margin");
  mEl.textContent = pct(r.margin);
  mEl.style.color = r.margin >= 15 ? "#3a7a3a" : r.margin >= 5 ? "#d4850a" : "#e05252";
  animateBar("profit-bar-fill", clamp((r.margin / 30) * 100, 0, 100), 100);

  // Module 3 — Sustainability
  var cfg = SUSTAIN_CONFIG[b.sustain];
  document.getElementById("s-low-profit").textContent       = fmt(r.fy_low);
  document.getElementById("s-low-profit").style.color       = r.fy_low >= 0 ? "#1a2e1a" : "#e05252";
  document.getElementById("s-high-profit").textContent      = fmt(r.fy_high);
  document.getElementById("s-selected-profit").textContent  = fmt(r.fy_sel);
  document.getElementById("sustain-selected-label").textContent = cfg.label;

  var insightMap = {
    low:    "⚠️ Non-green MSMEs face 8% higher cost burden. Over 5 years, rising input costs compound losses. Transitioning to green practices is strongly advisable.",
    medium: "🌿 Semi-green adoption provides a 4% annual growth advantage via energy savings and better credit access. Consider upgrading to full green certification.",
    high:   "🌍 Fully sustainable MSMEs enjoy a 9% annual growth edge via energy cuts, ESG credit incentives, and government green subsidies under India's Net Zero 2070 agenda.",
  };
  document.getElementById("sustain-insight").textContent = insightMap[b.sustain];

  if (b.sustain !== "low" && r.fy_low !== 0) {
    var boost = ((r.fy_sel - r.fy_low) / Math.abs(r.fy_low)) * 100;
    document.getElementById("sustain-boost").textContent =
      "📊 Green advantage over non-green: " + (boost > 0 ? "+" : "") + boost.toFixed(1) + "% over 5 years";
  } else {
    document.getElementById("sustain-boost").textContent = "";
  }

  // Module 4 — Policy
  var scenarios = [
    { rate: 4.0, label: "Accommodative", cls: "ps-low",    icon: "🚀", impact: "Strong credit flow. MSMEs expand rapidly. Low EMI burden drives investment." },
    { rate: 6.5, label: "Neutral",       cls: "ps-medium", icon: "⚖️", impact: "Balanced growth. Moderate borrowing costs. Stable MSME environment." },
    { rate: 9.0, label: "Tight",         cls: "ps-high",   icon: "🛑", impact: "Credit squeeze. Higher EMIs reduce expansion. Survival under pressure." },
  ];
  var psEl = document.getElementById("policy-scenarios");
  psEl.innerHTML = "";
  scenarios.forEach(function (sc) {
    var cur = Math.abs(sc.rate - b.rbi) < 1.5;
    var d = document.createElement("div");
    d.className = "policy-scenario " + sc.cls + (cur ? " ps-current" : "");
    d.innerHTML =
      '<span class="ps-icon">' + sc.icon + '</span>' +
      '<div class="ps-rate">' + sc.rate + '%</div>' +
      '<div class="ps-label">' + sc.label + (cur ? " ← You" : "") + '</div>' +
      '<div class="ps-impact">' + sc.impact + '</div>';
    psEl.appendChild(d);
  });
  document.getElementById("policy-verdict").innerHTML =
    b.rbi <= 5
      ? "✅ RBI rate of " + b.rbi + "% is <strong>accommodative</strong>. Low-cost credit enables expansion, hiring, and tech investment."
      : b.rbi <= 7.5
      ? "⚖️ RBI rate of " + b.rbi + "% is <strong>neutral</strong>. Borrowing is manageable. Focus on cost efficiency to protect margins."
      : "⚠️ RBI rate of " + b.rbi + "% is <strong>tight</strong>. High interest compresses margins. Reduce debt dependency and improve self-financing.";

  // Module 5 — GDP
  var emp = Math.round((b.inv / 100000) * 0.5 + (r.R / 200000));
  document.getElementById("gdp-employment").textContent = "~" + emp + " workers";
  var tier, chain;
  if      (b.inv < 100000)  { tier = "Micro (Low)";            chain = "Micro Enterprise"; }
  else if (b.inv < 1000000) { tier = "Small (Medium)";         chain = "Small Enterprise"; }
  else if (b.inv < 5000000) { tier = "Medium (High)";          chain = "Medium Enterprise"; }
  else                       { tier = "Large MSME (Very High)"; chain = "Upper Medium"; }
  document.getElementById("gdp-tier").textContent   = tier;
  document.getElementById("gdp-chain").textContent  = chain;
  document.getElementById("gdp-export").textContent =
    (r.margin > 15 && b.sustain !== "low") ? "High Potential" : r.margin > 5 ? "Moderate" : "Limited";

  // Module 6 — Dashboard
  document.getElementById("health-score-num").textContent = r.fhs;
  var offset = 314 - (314 * r.fhs / 100);
  setTimeout(function () {
    var ring = document.getElementById("ring-fill");
    if (ring) {
      ring.style.strokeDashoffset = offset;
      ring.style.stroke = r.fhs >= 70 ? "#6cbf6c" : r.fhs >= 45 ? "#c9a84c" : "#e05252";
    }
  }, 200);

  document.getElementById("score-grade").textContent =
    r.fhs >= 80 ? "Excellent 🌟" : r.fhs >= 65 ? "Good ✅" :
    r.fhs >= 50 ? "Moderate ⚖️" : r.fhs >= 35 ? "Weak ⚠️" : "Critical 🚨";

  animateBar("growth-bar",    clamp((r.margin / 30) * 100, 0, 100), 300);
  animateBar("sustain-bar",   { low: 20, medium: 55, high: 90 }[b.sustain], 450);
  animateBar("policy-bar",    clamp(((10 - b.rbi) / 10) * 100, 0, 100), 600);
  animateBar("inflation-bar", clamp(((20 - b.inf) / 20) * 100, 0, 100), 750);

  document.getElementById("growth-val").textContent    = r.margin >= 0 ? pct(r.margin) + " margin" : "Negative";
  document.getElementById("sustain-val").textContent   = { low: "Low — 2/10", medium: "Medium — 6/10", high: "High — 9/10" }[b.sustain];
  document.getElementById("policy-val").textContent    = b.rbi <= 5 ? "Favourable" : b.rbi <= 7.5 ? "Neutral" : "Restrictive";
  document.getElementById("inflation-val").textContent = b.inf <= 4 ? "Low risk" : b.inf <= 7 ? "Moderate" : "High risk";

  var icon, msg, tags;
  if (r.fhs >= 70) {
    icon = "🌿"; tags = ["Profitable", "Growth Ready", "Low Risk", "Recommended: Scale Up"];
    msg  = "Your MSME is financially robust. With a " + pct(r.margin) + " profit margin and " + b.sustain + " sustainability adoption, you are well-positioned for long-term growth. Continue investing in green practices to unlock government subsidies and ESG credit lines.";
  } else if (r.fhs >= 50) {
    icon = "⚖️"; tags = ["Stable", "Cost Pressure", "Monitor Closely", "Recommended: Optimise"];
    msg  = "Your MSME is moderately healthy. Review your cost structure — production costs and RBI-linked interest are the primary pressure points. Upgrading sustainability practices will provide a competitive edge.";
  } else if (r.fhs >= 35) {
    icon = "⚠️"; tags = ["Stressed", "High Interest Risk", "Action Needed", "Recommended: Restructure"];
    msg  = "Your MSME is under financial stress. Inflation erosion (" + pct(b.inf) + ") and high borrowing costs (" + pct(b.rbi) + " repo) are compressing margins. Immediate cost restructuring and green adoption advised.";
  } else {
    icon = "🚨"; tags = ["Critical", "Survival Risk", "Immediate Action", "Seek ECLGS Support"];
    msg  = "Critical financial health. Your MSME faces viability risk. Seek RBI MSME Emergency Credit Line (ECLGS), reduce production costs, and urgently adopt sustainability for subsidy relief.";
  }
  document.getElementById("verdict-icon").textContent = icon;
  document.getElementById("verdict-text").textContent = msg;
  document.getElementById("verdict-tags").innerHTML   = tags.map(function (t) {
    return '<span class="vtag">' + t + "</span>";
  }).join("");

  renderCharts();
  renderCompareCards();
  document.getElementById("results-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── COMPARE SCENARIOS ───────────────────────────────────────────
function toggleScenario(key) {
  if (activeScenarios[key]) {
    delete activeScenarios[key];
    document.getElementById("btn-sc-" + key).classList.remove("active");
  } else {
    activeScenarios[key] = true;
    document.getElementById("btn-sc-" + key).classList.add("active");
  }
  renderCompareCards();
  renderCharts();
}

function buildScenarioInputs(key) {
  var b   = Object.keys(lastInputs).length ? lastInputs : getInputs();
  var def = SCENARIO_DEFS[key];
  return {
    inv:     b.inv,
    rev:     b.rev,
    rbi:     def.changes.rbi_rate       !== undefined ? def.changes.rbi_rate       : b.rbi,
    inf:     def.changes.inflation      !== undefined ? def.changes.inflation      : b.inf,
    cost:    def.changes.cost_pct       !== undefined ? def.changes.cost_pct       : b.cost,
    sustain: def.changes.sustainability !== undefined ? def.changes.sustainability : b.sustain,
  };
}

function fhsGrade(s) {
  return s >= 80 ? "Excellent 🌟" : s >= 65 ? "Good ✅" : s >= 50 ? "Moderate ⚖️" : s >= 35 ? "Weak ⚠️" : "Critical 🚨";
}
function fhsBg(s)    { return s >= 70 ? "rgba(74,158,74,0.25)" : s >= 45 ? "rgba(201,168,76,0.2)" : "rgba(224,82,82,0.2)"; }
function fhsColor(s) { return s >= 70 ? "#6cbf6c"              : s >= 45 ? "#c9a84c"               : "#fca5a5"; }

function renderCompareCards() {
  var grid = document.getElementById("compare-grid");
  var note = document.getElementById("compare-note");
  var keys = Object.keys(activeScenarios);

  if (keys.length === 0) { grid.innerHTML = ""; note.style.display = "block"; return; }
  note.style.display = "none";

  var b    = Object.keys(lastInputs).length ? lastInputs : getInputs();
  var base = calcMSME(b.inv, b.rev, b.rbi, b.inf, b.cost, b.sustain);
  var html = makeCard("base", "📊", "Base Case", "base", b.rbi, b.inf, b.cost, b.sustain, base, "Your current inputs", null);

  keys.forEach(function (key) {
    var si  = buildScenarioInputs(key);
    var sr  = calcMSME(si.inv, si.rev, si.rbi, si.inf, si.cost, si.sustain);
    var def = SCENARIO_DEFS[key];
    html += makeCard(key, def.icon, def.label, def.colorClass, si.rbi, si.inf, si.cost, si.sustain, sr, def.desc, base);
  });
  grid.innerHTML = html;
}

function makeCard(key, icon, label, cc, rbi, inf, cost, sustain, r, desc, base) {
  var marginDiff = "", fiveDiff = "";
  if (base) {
    var md = r.margin - base.margin, pd = r.fy_sel - base.fy_sel;
    marginDiff = ' &nbsp;<span style="color:' + (md >= 0 ? "#6cbf6c" : "#fca5a5") + '">' + (md >= 0 ? "▲" : "▼") + Math.abs(md).toFixed(1) + "%</span>";
    fiveDiff   = ' &nbsp;<span style="color:' + (pd >= 0 ? "#6cbf6c" : "#fca5a5") + '">' + (pd >= 0 ? "▲" : "▼") + fmt(Math.abs(pd)) + "</span>";
  }
  return (
    '<div class="compare-card' + (key !== "base" ? " active-card" : "") + '">' +
    '<div class="compare-card-header">' +
      '<span class="compare-card-icon">' + icon + "</span>" +
      '<div><div class="compare-card-name ' + cc + '">' + label + "</div>" +
      '<div style="font-size:0.7rem;color:rgba(255,255,255,0.4);margin-top:2px">' + desc + "</div></div>" +
    "</div>" +
    '<div class="compare-metric"><span class="cm-label">RBI Rate</span><span class="cm-val">' + rbi + "%</span></div>" +
    '<div class="compare-metric"><span class="cm-label">Inflation</span><span class="cm-val">' + inf + "%</span></div>" +
    '<div class="compare-metric"><span class="cm-label">Cost %</span><span class="cm-val">' + cost + "%</span></div>" +
    '<div class="compare-metric"><span class="cm-label">Sustainability</span><span class="cm-val">' + sustain + "</span></div>" +
    '<div class="compare-metric"><span class="cm-label">Net Annual Profit</span><span class="cm-val ' + (r.net >= 0 ? "pos" : "neg") + '">' + fmt(r.net) + "</span></div>" +
    '<div class="compare-metric"><span class="cm-label">Profit Margin</span><span class="cm-val ' + (r.margin >= 10 ? "pos" : "neg") + '">' + pct(r.margin) + marginDiff + "</span></div>" +
    '<div class="compare-metric"><span class="cm-label">5-Yr Profit</span><span class="cm-val ' + (r.fy_sel >= 0 ? "pos" : "neg") + '">' + fmt(r.fy_sel) + fiveDiff + "</span></div>" +
    '<div class="compare-score-badge" style="background:' + fhsBg(r.fhs) + ";color:" + fhsColor(r.fhs) + '">FHS: ' + r.fhs + " / 100 &nbsp;" + fhsGrade(r.fhs) + "</div>" +
    "</div>"
  );
}

// ── CHARTS ──────────────────────────────────────────────────────
function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function baseChartOpts(yLabel, xLabel, subtitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#3d5c3d", font: { family: "DM Sans", size: 11 } } },
      subtitle: { display: !!subtitle, text: subtitle || "", color: "#6b8a6b", font: { size: 10 } },
    },
    scales: {
      y: { grid: { color: "rgba(45,90,45,0.08)" }, ticks: { color: "#6b8a6b", font: { family: "DM Sans" } }, title: { display: !!yLabel, text: yLabel || "", color: "#6b8a6b" } },
      x: { grid: { display: false }, ticks: { color: "#6b8a6b", font: { family: "DM Sans" } }, title: { display: !!xLabel, text: xLabel || "", color: "#6b8a6b" } },
    },
  };
}

function renderCharts() {
  var b = Object.keys(lastInputs).length ? lastInputs : getInputs();

  // Chart 1 — Profit vs RBI Rate (line)
  var rates = [2, 3, 4, 5, 6, 6.5, 7, 8, 9, 10, 11, 12];
  var profBase  = rates.map(function (r2) { return calcMSME(b.inv, b.rev, r2, b.inf, b.cost, b.sustain).net / 1000; });
  var profGreen = rates.map(function (r2) { return calcMSME(b.inv, b.rev, r2, b.inf, b.cost, "high").net / 1000; });
  destroyChart("chart-profit-rbi");
  chartInstances["chart-profit-rbi"] = new Chart(document.getElementById("chart-profit-rbi"), {
    type: "line",
    data: {
      labels: rates.map(function (r) { return r + "%"; }),
      datasets: [
        { label: "Base MSME",      data: profBase,  borderColor: "#4a9e4a", backgroundColor: "rgba(74,158,74,0.1)",  fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
        { label: "Fully Green",    data: profGreen, borderColor: "#c9a84c", backgroundColor: "rgba(201,168,76,0.08)", fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [5, 4] },
      ],
    },
    options: baseChartOpts("Net Profit (₹ thousands)", "RBI Repo Rate →", "Higher rate = lower profit — monetary transmission"),
  });

  // Chart 2 — Green adoption 5-year bar
  var yearData = [1, 2, 3, 4, 5].map(function (yr) {
    return ["low", "medium", "high"].map(function (sl) {
      var cf = SUSTAIN_CONFIG[sl];
      var R  = b.rev * 12, ac = b.cost * cf.costMult;
      var gp = R * (1 - ac / 100), ie = gp * (b.inf / 100) * 0.5;
      var an = gp - b.inv * 0.4 * (b.rbi / 100) - ie;
      return (an * Math.pow(1 + cf.growthBonus, yr)) / 1000;
    });
  });
  destroyChart("chart-green-profit");
  chartInstances["chart-green-profit"] = new Chart(document.getElementById("chart-green-profit"), {
    type: "bar",
    data: {
      labels: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
      datasets: [
        { label: "Non-Green",  data: yearData.map(function (y) { return y[0]; }), backgroundColor: "rgba(224,82,82,0.8)",  borderRadius: 4 },
        { label: "Semi-Green", data: yearData.map(function (y) { return y[1]; }), backgroundColor: "rgba(201,168,76,0.8)", borderRadius: 4 },
        { label: "Fully Green",data: yearData.map(function (y) { return y[2]; }), backgroundColor: "rgba(74,158,74,0.85)", borderRadius: 4 },
      ],
    },
    options: baseChartOpts("Annual Profit (₹ thousands)", "Year →", "Green compounding: g ∈ {0%, 4%, 9%} per annum"),
  });

  // Chart 3 — Radar
  var radarLabels = ["Profit Margin", "Sustainability", "Policy Resilience", "Inflation Immunity", "5-Yr Growth"];
  function radarVals(inv, rev, rbi, inf, cost, sust) {
    var rc = calcMSME(inv, rev, rbi, inf, cost, sust);
    return [
      clamp((rc.margin / 30) * 100, 0, 100),
      { low: 20, medium: 55, high: 90 }[sust],
      clamp(((10 - rbi) / 10) * 100, 0, 100),
      clamp(((20 - inf) / 20) * 100, 0, 100),
      clamp((rc.fy_sel / 500000) * 100, 0, 100),
    ];
  }
  var radarSets = [{ label: "Base Case", data: radarVals(b.inv, b.rev, b.rbi, b.inf, b.cost, b.sustain), borderColor: "#6cbf6c", backgroundColor: "rgba(74,158,74,0.12)" }];
  var rColors   = { inflation: ["#fca5a5", "rgba(224,82,82,0.1)"], lowrate: ["#7dd3fc", "rgba(74,158,200,0.1)"], green: ["#95d695", "rgba(74,158,74,0.15)"], crisis: ["#fcd34d", "rgba(212,133,10,0.1)"] };
  Object.keys(activeScenarios).forEach(function (key) {
    var si = buildScenarioInputs(key);
    var rc = rColors[key] || ["#fff", "rgba(255,255,255,0.05)"];
    radarSets.push({ label: SCENARIO_DEFS[key].label, data: radarVals(si.inv, si.rev, si.rbi, si.inf, si.cost, si.sustain), borderColor: rc[0], backgroundColor: rc[1] });
  });
  destroyChart("chart-radar");
  chartInstances["chart-radar"] = new Chart(document.getElementById("chart-radar"), {
    type: "radar",
    data: { labels: radarLabels, datasets: radarSets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#3d5c3d", font: { family: "DM Sans", size: 11 } } } },
      scales: { r: { backgroundColor: "rgba(248,252,248,0.5)", angleLines: { color: "rgba(45,90,45,0.2)" }, grid: { color: "rgba(45,90,45,0.15)" }, pointLabels: { color: "#3d5c3d", font: { size: 11 } }, ticks: { display: false }, min: 0, max: 100 } },
    },
  });

  // Chart 4 — Inflation vs Profit Erosion
  var infRates  = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  var netProfits = infRates.map(function (i) { return calcMSME(b.inv, b.rev, b.rbi, i, b.cost, b.sustain).net / 1000; });
  var erosions   = infRates.map(function (i) {
    var R = b.rev * 12, cf = SUSTAIN_CONFIG[b.sustain], gp = R * (1 - (b.cost * cf.costMult) / 100);
    return (gp * (i / 100) * 0.5) / 1000;
  });
  destroyChart("chart-inflation");
  chartInstances["chart-inflation"] = new Chart(document.getElementById("chart-inflation"), {
    type: "bar",
    data: {
      labels: infRates.map(function (i) { return i + "%"; }),
      datasets: [
        { label: "Net Profit (₹K)",       data: netProfits, backgroundColor: netProfits.map(function (v) { return v >= 0 ? "rgba(74,158,74,0.75)" : "rgba(224,82,82,0.75)"; }), borderRadius: 4, yAxisID: "y" },
        { label: "Inflation Erosion (₹K)", data: erosions,  type: "line", borderColor: "#e05252", backgroundColor: "rgba(224,82,82,0.08)", fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, yAxisID: "y" },
      ],
    },
    options: baseChartOpts("₹ Thousands", "Inflation Rate →", "IE = GP × (π/100) × 0.50 — 50% pass-through assumption"),
  });
}

// ── RESET ────────────────────────────────────────────────────────
function resetAll() {
  document.getElementById("investment").value    = "500000";
  document.getElementById("revenue").value       = "80000";
  document.getElementById("rbi_rate").value      = "6.5";
  document.getElementById("inflation").value     = "5.5";
  document.getElementById("cost_pct").value      = "60";
  document.getElementById("sustainability").value = "medium";

  activeScenarios = {};
  ["sc-inflation", "sc-lowrate", "sc-green", "sc-crisis"].forEach(function (k) {
    var btn = document.getElementById("btn-" + k); if (btn) btn.classList.remove("active");
  });

  [
    "pr-annual-rev", "pr-cost", "pr-interest", "pr-inflation", "pr-net", "pr-margin",
    "s-low-profit", "s-selected-profit", "s-high-profit",
    "gdp-employment", "gdp-tier", "gdp-chain", "gdp-export",
    "health-score-num", "score-grade", "growth-val", "sustain-val", "policy-val", "inflation-val",
  ].forEach(function (id) {
    var el = document.getElementById(id); if (el) { el.textContent = "—"; el.style.color = ""; }
  });

  document.getElementById("sustain-insight").textContent = "Run simulation to see insights.";
  document.getElementById("sustain-boost").textContent   = "";
  document.getElementById("policy-scenarios").innerHTML  = "";
  document.getElementById("policy-verdict").innerHTML    = "";
  document.getElementById("verdict-icon").textContent    = "🔄";
  document.getElementById("verdict-text").textContent    = "Run the simulation to see your MSME's health assessment and policy recommendations.";
  document.getElementById("verdict-tags").innerHTML      = "";
  document.getElementById("compare-grid").innerHTML      = "";
  document.getElementById("compare-note").style.display  = "block";

  ["profit-bar-fill", "growth-bar", "sustain-bar", "policy-bar", "inflation-bar"].forEach(function (id) {
    var el = document.getElementById(id); if (el) el.style.width = "0%";
  });

  var ring = document.getElementById("ring-fill");
  if (ring) { ring.style.strokeDashoffset = "314"; ring.style.stroke = "#6cbf6c"; }

  Object.keys(chartInstances).forEach(function (k) { destroyChart(k); });
}

// ── AUTO-RUN ─────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", function () {
  setTimeout(runSimulation, 400);
});
