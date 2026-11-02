/* County Emergency Management Profile — demo
   - ArcGIS OAuth 2.0 sign-in gate (ArcGIS Maps SDK for JavaScript 4.30)
   - Chart.js charts, HTML infographics, ArcGIS heat map
   - html2pdf.js "Download PDF"
*/
(function () {
  "use strict";

  /* ------------------------------------------------------------------ CONFIG */
  const CONFIG = {
    CLIENT_ID: "hN0QCOV06sz2er5f",
    PORTAL_URL: "https://www.arcgis.com"   // change to https://<your-org>.maps.arcgis.com or your Enterprise portal if needed
  };

  const P = window.PROFILE;
  const $ = (id) => document.getElementById(id);

  // Local preview without sign-in: only on localhost and only with ?preview
  const isLocalPreview = ["localhost", "127.0.0.1"].includes(location.hostname) &&
                         new URLSearchParams(location.search).has("preview");

  /* ------------------------------------------------------------------ PALETTE */
  const COL = {
    county: "#2a78d6", state: "#eb6834",
    grid: "#ecebe6", ink: "#0b0b0b", ink2: "#52514e", ink3: "#8a8984",
    seqLight: "#86b6ef", seqDark: "#1c5cab", seqDarker: "#0d366b"
  };
  const CAT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
  const TYPE_COLOR = {
    "Flooding": CAT[0], "Tornado": CAT[1], "Winter Storm": CAT[2],
    "Severe Storms": CAT[3], "Tropical": CAT[4], "Biological": CAT[6]
  };
  const TYPE_ABBR = {
    "Flooding": "FL", "Tornado": "TO", "Winter Storm": "WS",
    "Severe Storms": "SS", "Tropical": "TS", "Biological": "BIO"
  };
  const PA_CATS = [
    ["A", "Debris removal"], ["B", "Emergency protective measures"], ["C", "Roads & bridges"],
    ["D", "Water control facilities"], ["E", "Buildings & equipment"], ["F", "Utilities"],
    ["G", "Parks, recreation & other"]
  ];
  const IA_TYPES = [
    ["repair", "Home repair", "HA"], ["replacement", "Home replacement", "HA"], ["rental", "Rental assistance", "HA"],
    ["personalProperty", "Personal property", "ONA"], ["transportation", "Transportation", "ONA"],
    ["medical", "Medical & dental", "ONA"], ["otherONA", "Other needs", "ONA"]
  ];
  const PHASE_COLOR = { Mitigation: CAT[0], Preparedness: CAT[1], Response: CAT[2], Recovery: CAT[3] };

  /* ------------------------------------------------------------------ FORMAT */
  const nf = new Intl.NumberFormat("en-US");
  const fmtN = (v) => nf.format(Math.round(v));
  const fmtPct = (v, d = 1) => `${v.toFixed(d)}%`;
  const fmtMoney = (v) => {
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
    return `$${fmtN(v)}`;
  };
  const fmtMoneyFull = (v) => `$${nf.format(Math.round(v))}`;
  const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);
  const M = (v) => +(v / 1e6).toFixed(2);
  const dt = (s) => new Date(s + "T12:00:00");
  const fmtDate = (s) => dt(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const durationDays = (d) => Math.round((dt(d.end) - dt(d.start)) / 864e5) + 1;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function rating(score) {
    if (score >= 80) return { label: "Very High", color: "#b42318" };
    if (score >= 60) return { label: "Relatively High", color: "#d9480f" };
    if (score >= 40) return { label: "Relatively Moderate", color: "#b07800" };
    if (score >= 20) return { label: "Relatively Low", color: "#2f855a" };
    return { label: "Very Low", color: "#1f6a45" };
  }

  /* ------------------------------------------------------------------ DERIVED */
  const D = (() => {
    const g = P.general;
    const dis = P.disasters.slice().sort((a, b) => dt(a.start) - dt(b.start));
    dis.forEach((d) => {
      d.paTotal = sum(Object.values(d.pa));
      d.iaTotal = d.ia ? sum(IA_TYPES.map(([k]) => d.ia[k])) : 0;
      d.year = dt(d.start).getFullYear();
      d.days = durationDays(d);
    });
    const paByCat = {};
    PA_CATS.forEach(([k]) => (paByCat[k] = sum(dis.map((d) => d.pa[k]))));
    const paTotal = sum(Object.values(paByCat));
    const iaDis = dis.filter((d) => d.ia);
    const iaByType = {};
    IA_TYPES.forEach(([k]) => (iaByType[k] = sum(iaDis.map((d) => d.ia[k]))));
    const iaTotal = sum(Object.values(iaByType));
    const grantsTotal = sum(P.grants.map((x) => x.amount));
    return {
      dis, paByCat, paTotal, iaDis, iaByType, iaTotal, grantsTotal,
      pop: g.population.county, hh: g.households.county,
      density: { county: g.population.county / g.landAreaSqMi.county, state: g.population.state / g.landAreaSqMi.state },
      vul: Object.fromEntries(P.vulnerable.map((v) => [v.key, v]))
    };
  })();

  /* ------------------------------------------------------------------ AUTH */
  const btnSignIn = $("btnSignIn");
  const gateMsg = (m) => ($("gateMsg").textContent = m || "");
  let esriIdRef = null;

  function startAuth() {
    if (isLocalPreview) return showApp("Local preview (no sign-in)");
    if (typeof window.require !== "function") {
      btnSignIn.textContent = "Sign-in unavailable";
      gateMsg("Could not load the ArcGIS Maps SDK. Check your network connection and reload.");
      return;
    }
    window.require(["esri/identity/OAuthInfo", "esri/identity/IdentityManager", "esri/portal/Portal"],
      (OAuthInfo, esriId, Portal) => {
        esriIdRef = esriId;
        const info = new OAuthInfo({
          appId: CONFIG.CLIENT_ID,
          portalUrl: CONFIG.PORTAL_URL,
          popup: false,          // full-page redirect back to this page
          flowType: "auto"       // authorization code + PKCE
        });
        esriId.registerOAuthInfos([info]);
        const sharingUrl = info.portalUrl + "/sharing";

        btnSignIn.onclick = () => {
          btnSignIn.disabled = true;
          btnSignIn.textContent = "Redirecting to ArcGIS…";
          esriId.getCredential(sharingUrl).catch((e) => {
            btnSignIn.disabled = false;
            btnSignIn.textContent = "Sign in with ArcGIS";
            gateMsg(e && e.message ? e.message : "Sign-in was cancelled.");
          });
        };

        esriId.checkSignInStatus(sharingUrl)
          .then(() => {
            const portal = new Portal({ url: CONFIG.PORTAL_URL, authMode: "immediate" });
            return portal.load()
              .then(() => showApp(portal.user ? (portal.user.fullName || portal.user.username) : "Signed in"))
              .catch(() => showApp("Signed in"));
          })
          .catch(() => {
            btnSignIn.disabled = false;
            btnSignIn.textContent = "Sign in with ArcGIS";
          });
      },
      (err) => gateMsg("ArcGIS SDK failed to load: " + (err && err.message)));
  }

  $("btnSignOut").onclick = () => {
    if (esriIdRef) esriIdRef.destroyCredentials();
    window.location.href = window.location.pathname;   // drop any hash / query
  };

  let rendered = false;
  function showApp(userLabel) {
    $("gate").hidden = true;
    $("gate").style.display = "none";
    $("app").hidden = false;
    $("userName").textContent = userLabel;
    if (!rendered) { rendered = true; renderAll(); }
  }

  /* ------------------------------------------------------------------ CHART DEFAULTS */
  const charts = {};
  function setupChartDefaults() {
    if (!window.Chart) return false;
    Chart.defaults.font.family = getComputedStyle(document.documentElement).fontFamily;
    Chart.defaults.font.size = 11;
    Chart.defaults.color = COL.ink2;
    Chart.defaults.devicePixelRatio = Math.max(2, window.devicePixelRatio || 1);
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation.duration = 500;
    Chart.defaults.plugins.legend.labels.boxWidth = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
    Chart.defaults.plugins.legend.labels.useBorderRadius = true;
    Chart.defaults.plugins.legend.labels.borderRadius = 2;
    Chart.defaults.plugins.tooltip.backgroundColor = "#14213d";
    Chart.defaults.plugins.tooltip.padding = 8;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.scale.grid.color = COL.grid;
    Chart.defaults.scale.border.display = false;
    Chart.defaults.elements.bar.borderRadius = 4;
    Chart.defaults.elements.bar.borderSkipped = "start";
    Chart.defaults.elements.line.borderWidth = 2;
    Chart.defaults.elements.point.radius = 3;
    Chart.defaults.elements.point.hoverRadius = 6;
    Chart.defaults.elements.arc.borderWidth = 2;
    Chart.defaults.elements.arc.borderColor = "#fcfcfb";
    return true;
  }
  function mk(id, cfg, label) {
    const el = $(id);
    if (!el) return;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", label || id);
    charts[id] = new Chart(el, cfg);
  }
  const noGridX = { grid: { display: false } };
  const legendBottom = { position: "bottom", labels: { padding: 12 } };
  const moneyAxis = (suffix = "M") => ({ ticks: { callback: (v) => `$${v}${suffix}` } });
  const moneyTip = (suffix = "M") => ({ callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ": " : ""}$${(c.parsed.x ?? c.parsed.y ?? c.parsed).toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}` } });

  /* ------------------------------------------------------------------ RENDER */
  function kpi(label, value, cmp) {
    return `<div class="kpi"><div class="k-label">${label}</div><div class="k-val">${value}</div>${cmp ? `<div class="k-cmp">${cmp}</div>` : ""}</div>`;
  }

  function renderAll() {
    const c = P.county;
    $("heroRegion").textContent = `${c.state} · ${c.region}`;
    $("heroName").textContent = c.name;
    $("heroSub").textContent = `County seat: ${c.seat} · FIPS ${c.fips} · Profile as of ${c.asOf}`;
    const r = rating(P.risk.overall.county);
    $("heroRisk").textContent = P.risk.overall.county.toFixed(1);
    $("heroRiskRating").textContent = r.label;
    $("heroRiskRating").style.background = r.color;
    $("heroRiskState").textContent = `State average county: ${P.risk.overall.state.toFixed(1)}`;
    $("footStamp").textContent = `Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.`;

    const stateCountyAvgDecl = sum(P.stateDisasterBenchmarks.stateAvgDecls);
    $("summaryKpis").innerHTML = [
      kpi("Population", fmtN(D.pop), `${fmtN(D.density.county)} per sq mi`),
      kpi("Major declarations", D.dis.length, `since 2010 · state avg ${stateCountyAvgDecl.toFixed(1)}`),
      kpi("FEMA PA + IA", fmtMoney(D.paTotal + D.iaTotal), "federal share, all declarations"),
      kpi("Other EM grants", fmtMoney(D.grantsTotal), `${P.grants.length} awards`),
      kpi("Social vulnerability", P.svi.county.toFixed(2), `state ${P.svi.state.toFixed(2)} · 0–1 scale`)
    ].join("");

    renderGeneral();
    renderVulnerable();
    renderHistory();
    renderPA();
    renderIA();
    renderGrants();
    renderRisk();
    initMap();
  }

  /* ---------- 1. General ---------- */
  function renderGeneral() {
    const g = P.general;
    const s = (v) => `State: <b>${v}</b>`;
    $("generalKpis").innerHTML = [
      kpi("Land area", `${fmtN(g.landAreaSqMi.county)} sq mi`, `${fmtN(D.density.county)} people / sq mi · ${s(fmtN(D.density.state))}`),
      kpi("Households", fmtN(g.households.county), `${(D.pop / g.households.county).toFixed(2)} persons per household`),
      kpi("Median age", g.medianAge.county.toFixed(1), s(g.medianAge.state.toFixed(1))),
      kpi("Median household income", fmtMoneyFull(g.medianHHIncome.county), s(fmtMoneyFull(g.medianHHIncome.state))),
      kpi("Median home value", fmtMoneyFull(g.medianHomeValue.county), s(fmtMoneyFull(g.medianHomeValue.state))),
      kpi("Homeownership rate", fmtPct(g.homeownership.county), s(fmtPct(g.homeownership.state))),
      kpi("Unemployment rate", fmtPct(g.unemployment.county), s(fmtPct(g.unemployment.state))),
      kpi("Bachelor's degree or higher", fmtPct(g.bachelorsPlus.county), s(fmtPct(g.bachelorsPlus.state)))
    ].join("");

    if (!window.Chart) return;
    const t = P.popTrend;
    const idx = (arr) => arr.map((v) => +(v / arr[0] * 100).toFixed(1));
    mk("chPop", {
      type: "line",
      data: { labels: t.years, datasets: [
        { label: "County", data: idx(t.county), borderColor: COL.county, backgroundColor: COL.county },
        { label: "State", data: idx(t.state), borderColor: COL.state, backgroundColor: COL.state }
      ] },
      options: { interaction: { mode: "index", intersect: false }, plugins: { legend: legendBottom,
        tooltip: { callbacks: { afterLabel: (c) => `Population: ${fmtN((c.datasetIndex ? t.state : t.county)[c.dataIndex])}` } } },
        scales: { x: noGridX } }
    }, "Population growth indexed to 2000, county vs state");

    const a = P.ageGroups;
    mk("chAge", {
      type: "bar",
      data: { labels: a.labels, datasets: [
        { label: "County", data: a.county, backgroundColor: COL.county },
        { label: "State", data: a.state, backgroundColor: COL.state }
      ] },
      options: { plugins: { legend: legendBottom, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}%` } } },
        scales: { x: noGridX, y: { ticks: { callback: (v) => v + "%" } } }, datasets: { bar: { categoryPercentage: .7, barPercentage: .9 } } }
    }, "Age distribution, county vs state");

    const h = P.housingType;
    mk("chHousing", {
      type: "doughnut",
      data: { labels: h.labels, datasets: [{ data: h.county, backgroundColor: CAT.slice(0, 4) }] },
      options: { cutout: "62%", plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed}%` } } } }
    }, "Housing units by type");
  }

  /* ---------- 2. Vulnerable populations ---------- */
  function renderVulnerable() {
    const v = P.vulnerable;
    const base = (x) => (x.base === "persons" ? D.pop : x.base === "households" ? D.hh : null);

    // waffles
    const pick = ["age65", "disability", "nobroadband"];
    $("waffles").innerHTML = pick.map((k) => {
      const x = D.vul[k];
      const on = Math.round(x.county);
      const cells = Array.from({ length: 100 }, (_, i) => `<i class="${i < on ? "on" : ""}"></i>`).join("");
      const n = base(x) ? `≈ ${fmtN(base(x) * x.county / 100)} ${x.base}` : "";
      return `<div class="card waffle-card"><div class="waffle" aria-hidden="true">${cells}</div>
        <div class="waffle-text"><div class="big">${fmtPct(x.county)}</div><div class="lbl">${x.label}</div>
        <div class="cmp">${n}<br>State: ${fmtPct(x.state)}</div></div></div>`;
    }).join("");

    // people counts
    const rows = [
      ["Residents 65+", D.pop * D.vul.age65.county / 100],
      ["Residents with a disability", D.pop * D.vul.disability.county / 100],
      ["Residents below poverty", D.pop * D.vul.poverty.county / 100],
      ["Households with no vehicle", D.hh * D.vul.novehicle.county / 100],
      ["Electricity-dependent Medicare users", P.electricityDependent.county]
    ];
    $("peopleCounts").innerHTML = rows.map(([l, n]) => `<div class="pc"><span>${l}</span><b>${fmtN(n)}</b></div>`).join("");
    $("sviReadout").innerHTML = `<span class="big">${P.svi.county.toFixed(2)}</span>${rating(P.svi.county * 100).label} · State ${P.svi.state.toFixed(2)}`;

    if (!window.Chart) return;
    mk("chVuln", {
      type: "bar",
      data: { labels: v.map((x) => x.label), datasets: [
        { label: "County", data: v.map((x) => x.county), backgroundColor: COL.county },
        { label: "State", data: v.map((x) => x.state), backgroundColor: COL.state }
      ] },
      options: { indexAxis: "y", plugins: { legend: { position: "top", align: "end" },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.x}% of ${v[c.dataIndex].base}` } } },
        scales: { x: { ticks: { callback: (x) => x + "%" } }, y: { grid: { display: false } } },
        datasets: { bar: { categoryPercentage: .72, barPercentage: .92 } } }
    }, "Vulnerable population indicators, county vs state");

    mk("chSvi", {
      type: "doughnut",
      data: { labels: ["SVI", ""], datasets: [{ data: [P.svi.county, 1 - P.svi.county], backgroundColor: [COL.state, "#ecebe6"] }] },
      options: { rotation: -90, circumference: 180, cutout: "72%", plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    }, `Social vulnerability index ${P.svi.county}`);
  }

  /* ---------- 3. Disaster history ---------- */
  function renderHistory() {
    const dis = D.dis;
    const deaths = sum(dis.map((d) => d.impacts.deaths));
    const homes = sum(dis.map((d) => d.impacts.homesDamaged + d.impacts.homesDestroyed));
    const nonPandemicDays = sum(dis.filter((d) => d.type !== "Biological").map((d) => d.days));
    const stateAvg = sum(P.stateDisasterBenchmarks.stateAvgDecls);
    $("historyKpis").innerHTML = [
      kpi("Major disaster declarations", dis.length, `vs. state county average of ${stateAvg.toFixed(1)}`),
      kpi("Homes damaged or destroyed", fmtN(homes), "across all declared events"),
      kpi("Lives lost", deaths, "weather-related events only"),
      kpi("Days under weather incident periods", nonPandemicDays, "excludes the pandemic declaration")
    ].join("");

    // timeline (evenly spaced, alternating above/below)
    const n = dis.length;
    let tl = `<div class="tl-axis"></div>`;
    dis.forEach((d, i) => {
      const left = n === 1 ? 50 : (i / (n - 1)) * 100;
      const top = i % 2 === 0;
      const color = TYPE_COLOR[d.type] || CAT[7];
      const label = `<div class="t"><b>${d.year} · ${esc(d.type)}</b>${d.days} day${d.days > 1 ? "s" : ""} · ${fmtMoney(d.paTotal + d.iaTotal)}</div>`;
      const icon = `<div class="ic" style="background:${color};font-size:${TYPE_ABBR[d.type].length > 2 ? 8 : 10}px">${TYPE_ABBR[d.type]}</div>`;
      tl += `<div class="tl-tick" style="left:${left}%"></div>`;
      tl += `<div class="tl-ev ${top ? "top" : "bot"}" style="left:${left}%" title="${esc(d.id + " — " + d.title)}">` +
            (top ? `${label}<div class="stem"></div>${icon}` : `${icon}<div class="stem"></div>${label}`) + `</div>`;
    });
    $("timeline").innerHTML = tl;

    // table
    const cell = (v) => (v === null || v === undefined ? "—" : fmtN(v));
    $("tblDisasters").innerHTML =
      `<thead><tr><th>Declaration</th><th>Event</th><th>Type</th><th>Incident period</th><th class="n">Days</th>
       <th class="n">Deaths</th><th class="n">Injuries</th><th class="n">Homes dmg / dest.</th><th class="n">Peak outages</th>
       <th class="n">PA</th><th class="n">IA</th><th>Key impacts</th></tr></thead><tbody>` +
      dis.map((d) => `<tr><td>${d.id}</td><td>${esc(d.title)}</td>
        <td><span class="tag" style="background:${TYPE_COLOR[d.type]}">${esc(d.type)}</span></td>
        <td style="white-space:nowrap">${fmtDate(d.start)}${d.end !== d.start ? " –<br>" + fmtDate(d.end) : ""}</td>
        <td class="n">${fmtN(d.days)}</td><td class="n">${cell(d.impacts.deaths)}</td><td class="n">${cell(d.impacts.injuries)}</td>
        <td class="n">${fmtN(d.impacts.homesDamaged)} / ${fmtN(d.impacts.homesDestroyed)}</td><td class="n">${fmtN(d.impacts.peakOutages)}</td>
        <td class="n">${fmtMoney(d.paTotal)}</td><td class="n">${d.ia ? fmtMoney(d.iaTotal) : "—"}</td><td>${esc(d.note)}</td></tr>`).join("") +
      `</tbody><tfoot><tr><td colspan="9">Total</td><td class="n">${fmtMoney(D.paTotal)}</td><td class="n">${fmtMoney(D.iaTotal)}</td><td></td></tr></tfoot>`;

    if (!window.Chart) return;
    const labels = dis.map((d) => `${d.year} ${d.type}`);
    mk("chByDisaster", {
      type: "bar",
      data: { labels, datasets: [
        { label: "Public Assistance", data: dis.map((d) => M(d.paTotal)), backgroundColor: COL.seqDark },
        { label: "Individual Assistance", data: dis.map((d) => M(d.iaTotal)), backgroundColor: COL.seqLight }
      ] },
      options: { plugins: { legend: legendBottom, tooltip: moneyTip() },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 50, minRotation: 50 } }, y: { stacked: true, ...moneyAxis() } } }
    }, "Federal assistance by disaster");

    const types = Object.keys(TYPE_COLOR).filter((t) => dis.some((d) => d.type === t));
    mk("chTypes", {
      type: "doughnut",
      data: { labels: types, datasets: [{ data: types.map((t) => dis.filter((d) => d.type === t).length), backgroundColor: types.map((t) => TYPE_COLOR[t]) }] },
      options: { cutout: "58%", plugins: { legend: legendBottom } }
    }, "Declarations by hazard type");

    const b = P.stateDisasterBenchmarks;
    const periodOf = (y) => (y < 2015 ? 0 : y < 2020 ? 1 : y < 2025 ? 2 : 3);
    const countyByPeriod = [0, 0, 0, 0];
    dis.forEach((d) => countyByPeriod[periodOf(d.year)]++);
    mk("chDeclPeriods", {
      type: "bar",
      data: { labels: b.periods, datasets: [
        { label: "County", data: countyByPeriod, backgroundColor: COL.county },
        { label: "State county average", data: b.stateAvgDecls, backgroundColor: COL.state }
      ] },
      options: { plugins: { legend: legendBottom }, scales: { x: noGridX, y: { ticks: { stepSize: 1 } } },
        datasets: { bar: { categoryPercentage: .6, barPercentage: .9 } } }
    }, "Declarations per period, county vs state average");

    mk("chHomes", {
      type: "bar",
      data: { labels, datasets: [
        { label: "Damaged", data: dis.map((d) => d.impacts.homesDamaged), backgroundColor: COL.seqLight },
        { label: "Destroyed", data: dis.map((d) => d.impacts.homesDestroyed), backgroundColor: COL.seqDarker }
      ] },
      options: { plugins: { legend: legendBottom },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 50, minRotation: 50 } }, y: { stacked: true } } }
    }, "Homes damaged or destroyed by disaster");
  }

  /* ---------- 4. Public Assistance ---------- */
  function renderPA() {
    const b = P.stateDisasterBenchmarks;
    const perCap = D.paTotal / D.pop;
    const top = PA_CATS.map(([k, l]) => [k, l, D.paByCat[k]]).sort((a, b2) => b2[2] - a[2])[0];
    const topDis = D.dis.slice().sort((a, b2) => b2.paTotal - a.paTotal)[0];
    $("paKpis").innerHTML = [
      kpi("Total PA obligated", fmtMoney(D.paTotal), `${D.dis.length} declarations`),
      kpi("PA per resident", `$${fmtN(perCap)}`, `State: <b>$${fmtN(b.paPerCapitaState)}</b>`),
      kpi("Largest category", `Cat ${top[0]}`, `${top[1]} · ${fmtMoney(top[2])}`),
      kpi("Largest PA event", fmtMoney(topDis.paTotal), `${topDis.id} · ${topDis.year} ${topDis.type}`)
    ].join("");

    if (!window.Chart) return;
    const catLabels = PA_CATS.map(([k, l]) => `${k} – ${l}`);
    mk("chPaCat", {
      type: "bar",
      data: { labels: catLabels, datasets: [{ label: "PA", data: PA_CATS.map(([k]) => M(D.paByCat[k])), backgroundColor: COL.county }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: moneyTip() },
        scales: { x: moneyAxis(), y: { grid: { display: false } } } }
    }, "PA by category");

    const countyShare = PA_CATS.map(([k]) => +(D.paByCat[k] / D.paTotal * 100).toFixed(1));
    mk("chPaMix", {
      type: "bar",
      data: { labels: ["County", "State"], datasets: PA_CATS.map(([k, l], i) => ({
        label: `${k} – ${l}`, data: [countyShare[i], b.paShareState[k]], backgroundColor: CAT[i], borderColor: "#fcfcfb", borderWidth: 1, borderRadius: 0
      })) },
      options: { indexAxis: "y", plugins: { legend: legendBottom, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.x}%` } } },
        scales: { x: { stacked: true, max: 100, ticks: { callback: (v) => v + "%" } }, y: { stacked: true, grid: { display: false } } },
        datasets: { bar: { barPercentage: .7 } } }
    }, "PA category mix, county vs state");

    mk("chPaStack", {
      type: "bar",
      data: { labels: D.dis.map((d) => `${d.year} ${d.type}`), datasets: PA_CATS.map(([k, l], i) => ({
        label: `${k} – ${l}`, data: D.dis.map((d) => M(d.pa[k])), backgroundColor: CAT[i], borderColor: "#fcfcfb", borderWidth: 1, borderRadius: 0
      })) },
      options: { plugins: { legend: { position: "right" }, tooltip: moneyTip() },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ...moneyAxis() } } }
    }, "PA by disaster and category");
  }

  /* ---------- 5. Individual Assistance ---------- */
  function renderIA() {
    const b = P.stateDisasterBenchmarks;
    const reg = sum(D.iaDis.map((d) => d.ia.registrations));
    const appr = sum(D.iaDis.map((d) => d.ia.approved));
    $("iaKpis").innerHTML = [
      kpi("Total IA approved", fmtMoney(D.iaTotal), `${D.iaDis.length} of ${D.dis.length} declarations included IA`),
      kpi("Registrations", fmtN(reg), `${fmtN(appr)} approved (${fmtPct(appr / reg * 100, 0)})`),
      kpi("Average award", `$${fmtN(D.iaTotal / appr)}`, "per approved household"),
      kpi("IA per resident", `$${fmtN(D.iaTotal / D.pop)}`, `State: <b>$${fmtN(b.iaPerCapitaState)}</b>`)
    ].join("");

    if (!window.Chart) return;
    const ha = sum(IA_TYPES.filter((t) => t[2] === "HA").map(([k]) => D.iaByType[k]));
    const ona = D.iaTotal - ha;
    mk("chIaSplit", {
      type: "doughnut",
      data: { labels: ["Housing Assistance", "Other Needs Assistance"], datasets: [{ data: [M(ha), M(ona)], backgroundColor: [COL.seqDark, COL.seqLight] }] },
      options: { cutout: "60%", plugins: { legend: legendBottom, tooltip: { callbacks: { label: (c) => `${c.label}: $${c.parsed}M (${(c.parsed / M(D.iaTotal) * 100).toFixed(0)}%)` } } } }
    }, "Housing vs other needs assistance");

    mk("chIaType", {
      type: "bar",
      data: { labels: IA_TYPES.map((t) => `${t[1]} (${t[2]})`), datasets: [{ label: "IA", data: IA_TYPES.map(([k]) => M(D.iaByType[k])),
        backgroundColor: IA_TYPES.map((t) => (t[2] === "HA" ? COL.seqDark : COL.seqLight)) }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: moneyTip() },
        scales: { x: moneyAxis(), y: { grid: { display: false } } } }
    }, "IA by assistance type");

    mk("chIaReg", {
      type: "bar",
      data: { labels: D.iaDis.map((d) => `${d.id} · ${d.year} ${d.type}`), datasets: [
        { label: "Registrations", data: D.iaDis.map((d) => d.ia.registrations), backgroundColor: COL.seqLight },
        { label: "Approved", data: D.iaDis.map((d) => d.ia.approved), backgroundColor: COL.seqDark }
      ] },
      options: { plugins: { legend: legendBottom }, scales: { x: noGridX }, datasets: { bar: { categoryPercentage: .6, barPercentage: .9 } } }
    }, "IA registrations and approvals by disaster");
  }

  /* ---------- 6. Grants ---------- */
  function renderGrants() {
    const g = P.grants.slice().sort((a, b) => a.year - b.year);
    const byPhase = {};
    g.forEach((x) => (byPhase[x.phase] = (byPhase[x.phase] || 0) + x.amount));
    const active = g.filter((x) => x.status !== "Closed");
    $("grantKpis").innerHTML = [
      kpi("Total awarded", fmtMoney(D.grantsTotal), `${g.length} awards since ${g[0].year}`),
      kpi("Mitigation investment", fmtMoney(byPhase.Mitigation || 0), `${fmtPct((byPhase.Mitigation || 0) / D.grantsTotal * 100, 0)} of grant dollars`),
      kpi("Active / ongoing awards", active.length, fmtMoney(sum(active.map((x) => x.amount))) + " open"),
      kpi("Grants per resident", `$${fmtN(D.grantsTotal / D.pop)}`, "excludes PA and IA")
    ].join("");

    $("tblGrants").innerHTML =
      `<thead><tr><th>Year</th><th>Program</th><th>Source</th><th>Mission area</th><th>Purpose</th><th class="n">Amount</th><th>Status</th></tr></thead><tbody>` +
      g.map((x) => `<tr><td>${x.year}</td><td><b>${esc(x.program)}</b></td><td>${x.source}</td>
        <td><span class="tag" style="background:${PHASE_COLOR[x.phase]}">${x.phase}</span></td><td>${esc(x.purpose)}</td>
        <td class="n">${fmtMoneyFull(x.amount)}</td><td><span class="pill ${x.status}">${x.status}</span></td></tr>`).join("") +
      `</tbody><tfoot><tr><td colspan="5">Total</td><td class="n">${fmtMoneyFull(D.grantsTotal)}</td><td></td></tr></tfoot>`;

    if (!window.Chart) return;
    const byProg = {};
    g.forEach((x) => { const k = x.program.replace(/ 5%$/, " (5% initiative)"); byProg[k] = (byProg[k] || 0) + x.amount; });
    const progs = Object.entries(byProg).sort((a, b) => b[1] - a[1]);
    mk("chGrantProg", {
      type: "bar",
      data: { labels: progs.map((p) => p[0]), datasets: [{ label: "Awarded", data: progs.map((p) => M(p[1])), backgroundColor: COL.county }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: moneyTip() },
        scales: { x: moneyAxis(), y: { grid: { display: false } } } }
    }, "Grant awards by program");

    const phases = Object.keys(PHASE_COLOR).filter((p) => byPhase[p]);
    mk("chGrantPhase", {
      type: "doughnut",
      data: { labels: phases, datasets: [{ data: phases.map((p) => M(byPhase[p])), backgroundColor: phases.map((p) => PHASE_COLOR[p]) }] },
      options: { cutout: "58%", plugins: { legend: legendBottom, tooltip: { callbacks: { label: (c) => `${c.label}: $${c.parsed}M` } } } }
    }, "Grant dollars by mission area");
  }

  /* ---------- 7. Risk ---------- */
  function renderRisk() {
    const R = P.risk;
    const hz = R.hazards.slice();
    const ealTotal = sum(hz.map((h) => h.eal));
    const topHz = hz.slice().sort((a, b) => b.county - a.county)[0];
    const ro = rating(R.overall.county);
    $("riskKpis").innerHTML = [
      kpi("Overall risk score", `${R.overall.county.toFixed(1)}`, `<span class="rating" style="background:${ro.color}">${ro.label}</span> · State ${R.overall.state.toFixed(1)}`),
      kpi("Expected annual loss", fmtMoney(ealTotal), `all ${hz.length} hazards combined`),
      kpi("Community resilience", R.resilience.county.toFixed(1), `State: <b>${R.resilience.state.toFixed(1)}</b> · higher is better`),
      kpi("Chance of a declaration", `${R.probMajorDecl5yr}%`, "modeled, next 5 years")
    ].join("");

    // likelihood x impact matrix
    const tint = (l, i) => { const s = l * i; return s >= 20 ? "#f4c7c3" : s >= 12 ? "#fbd9bf" : s >= 6 ? "#fbe9b5" : "#d7ecdf"; };
    let mx = "";
    for (let l = 5; l >= 1; l--) {
      mx += `<div class="mx-ylab">${l}</div>`;
      for (let i = 1; i <= 5; i++) {
        const chips = hz.filter((h) => h.likelihood === l && h.impact === i).map((h) => `<span class="mx-chip" title="${esc(h.name)}">${h.abbr}</span>`).join("");
        mx += `<div class="mx-cell" style="background:${tint(l, i)}">${chips}</div>`;
      }
    }
    mx += `<div></div>` + [1, 2, 3, 4, 5].map((i) => `<div class="mx-xlab">${i}</div>`).join("");
    $("matrix").innerHTML = mx;
    $("matrix").insertAdjacentHTML("afterend",
      `<div class="mx-axis-title">Impact → (1 minimal · 5 catastrophic) &nbsp;|&nbsp; Likelihood ↑ (1 rare · 5 almost certain)</div>
       <div class="mx-axis-title" style="margin-top:6px">${hz.map((h) => `<b>${h.abbr}</b> ${esc(h.name)}`).join(" · ")}</div>`);

    const arrow = { up: ["▲ Increasing", "trend-up"], down: ["▼ Decreasing", "trend-down"], steady: ["► Stable", "trend-steady"] };
    $("tblRisk").innerHTML =
      `<thead><tr><th>Hazard</th><th class="n">County</th><th>Rating</th><th class="n">State</th><th class="n">Events / yr</th><th>Outlook</th></tr></thead><tbody>` +
      hz.map((h) => { const rt = rating(h.county); const [t, cls] = arrow[h.trend];
        return `<tr><td>${esc(h.name)}</td><td class="n"><b>${h.county.toFixed(1)}</b></td>
          <td><span class="rating" style="background:${rt.color}">${rt.label}</span></td><td class="n">${h.state.toFixed(1)}</td>
          <td class="n">${h.freq < 0.01 ? "<0.01" : h.freq}</td><td class="${cls}">${t}</td></tr>`; }).join("") +
      `</tbody>`;

    if (!window.Chart) return;
    mk("chRadar", {
      type: "radar",
      data: { labels: hz.map((h) => h.name), datasets: [
        { label: "County", data: hz.map((h) => h.county), borderColor: COL.county, backgroundColor: "rgba(42,120,214,.15)", pointBackgroundColor: COL.county },
        { label: "State", data: hz.map((h) => h.state), borderColor: COL.state, backgroundColor: "rgba(235,104,52,.10)", pointBackgroundColor: COL.state }
      ] },
      options: { plugins: { legend: legendBottom },
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, backdropColor: "transparent", color: COL.ink3 }, grid: { color: COL.grid }, angleLines: { color: COL.grid },
          pointLabels: { font: { size: 11 }, color: COL.ink2 } } } }
    }, "Hazard risk scores, county vs state");

    const byEal = hz.slice().sort((a, b) => b.eal - a.eal);
    mk("chEal", {
      type: "bar",
      data: { labels: byEal.map((h) => h.name), datasets: [{ label: "Expected annual loss", data: byEal.map((h) => Math.round(h.eal / 1000)), backgroundColor: COL.county }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `$${c.parsed.x.toLocaleString()}K per year` } } },
        scales: { x: { ticks: { callback: (v) => `$${v.toLocaleString()}K` } }, y: { grid: { display: false } } } }
    }, "Expected annual loss by hazard");
  }

  /* ------------------------------------------------------------------ MAP */
  let mapView = null;
  let setMapField = null;
  let facilitiesLayer = null;

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function inPoly(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function gauss(rnd) { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // Synthetic census-block points with vulnerable-population counts
  function buildBlocks() {
    const rnd = mulberry32(20261102);
    const ring = P.geo.boundary;
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pts = [];
    const add = (x, y, urban, popW) => { if (inPoly(x, y, ring)) pts.push({ x, y, urban, popW }); };
    P.geo.towns.forEach((t) => {
      const n = Math.round(t.weight * 1400);
      for (let i = 0; i < n; i++) {
        const sd = 0.012 + 0.02 * rnd();
        const x = t.lon + gauss(rnd) * sd * 1.2, y = t.lat + gauss(rnd) * sd;
        const d = Math.hypot((x - t.lon) / 0.03, (y - t.lat) / 0.025);
        add(x, y, t.urban * Math.exp(-d * d / 2), 1.6);
      }
    });
    for (let i = 0; i < 420; i++) add(minX + rnd() * (maxX - minX), minY + rnd() * (maxY - minY), 0.03, 0.55);
    const wSum = sum(pts.map((p) => p.popW));
    const nz = () => 0.6 + rnd() * 0.8;
    return pts.map((p, i) => {
      const pop = D.pop * p.popW / wSum * (0.7 + rnd() * 0.6);
      const u = p.urban, ru = 1 - u;
      const a = {
        oid: i + 1,
        pop,
        age65: pop * (0.16 + 0.10 * ru) * nz(),
        disability: pop * (0.14 + 0.06 * ru) * nz(),
        poverty: pop * (0.10 + 0.12 * u) * nz(),
        novehicle: pop * (0.03 + 0.10 * u) * nz(),
        nobroadband: pop * (0.10 + 0.22 * ru) * nz(),
        mobilehome: pop * (0.03 + 0.22 * ru) * nz()
      };
      a.composite = (a.age65 + a.disability + a.poverty + a.novehicle * 2 + a.nobroadband * 0.5 + a.mobilehome) / 6;
      return { x: p.x, y: p.y, a };
    });
  }

  function initMap() {
    const msg = (t) => { $("mapView").innerHTML = `<div class="map-msg">${t}</div>`; };
    if (typeof window.require !== "function") { msg("Map unavailable — the ArcGIS Maps SDK did not load."); return; }

    window.require([
      "esri/Map", "esri/views/MapView", "esri/layers/FeatureLayer", "esri/layers/GraphicsLayer", "esri/Graphic",
      "esri/smartMapping/renderers/heatmap"
    ], (EsriMap, MapView, FeatureLayer, GraphicsLayer, Graphic, heatmapCreator) => {
      const sr = { wkid: 4326 };
      const blocks = buildBlocks();
      const fieldNames = ["pop", "age65", "disability", "poverty", "novehicle", "nobroadband", "mobilehome", "composite"];

      const heatLayer = new FeatureLayer({
        title: "Vulnerable populations",
        source: blocks.map((b) => new Graphic({ geometry: { type: "point", x: b.x, y: b.y, spatialReference: sr }, attributes: b.a })),
        objectIdField: "oid",
        geometryType: "point",
        spatialReference: sr,
        fields: [{ name: "oid", type: "oid" }].concat(fieldNames.map((f) => ({ name: f, type: "double" }))),
        renderer: { type: "simple", symbol: { type: "simple-marker", size: 3, color: [0, 0, 0, 0], outline: null } }
      });

      const base = new GraphicsLayer({ title: "County" });
      base.add(new Graphic({
        geometry: { type: "polygon", rings: [P.geo.boundary], spatialReference: sr },
        symbol: { type: "simple-fill", color: [255, 255, 255, 1], outline: { color: [20, 33, 61, 1], width: 0 } }
      }));

      const overlay = new GraphicsLayer({ title: "Reference" });
      overlay.add(new Graphic({
        geometry: { type: "polyline", paths: [P.geo.river], spatialReference: sr },
        symbol: { type: "simple-line", color: [125, 170, 220, 0.9], width: 2.5 }
      }));
      overlay.add(new Graphic({
        geometry: { type: "polygon", rings: [P.geo.boundary], spatialReference: sr },
        symbol: { type: "simple-fill", color: [0, 0, 0, 0], outline: { color: [20, 33, 61, 1], width: 2 } }
      }));
      P.geo.towns.forEach((t) => {
        overlay.add(new Graphic({
          geometry: { type: "point", x: t.lon, y: t.lat, spatialReference: sr },
          symbol: { type: "text", text: t.name, color: [20, 33, 61, 1], haloColor: [255, 255, 255, 0.95], haloSize: 1.5,
            yoffset: 14, font: { size: 10, weight: "bold", family: "Arial" } }
        }));
      });

      facilitiesLayer = new GraphicsLayer({ title: "Critical facilities" });
      const facSym = {
        "Hospital": { type: "simple-marker", style: "circle", size: 10, color: "#b42318", outline: { color: "white", width: 1.5 } },
        "Dialysis": { type: "simple-marker", style: "circle", size: 10, color: "#b42318", outline: { color: "white", width: 1.5 } },
        "Nursing home": { type: "simple-marker", style: "circle", size: 9, color: "#6250d6", outline: { color: "white", width: 1.5 } },
        "Shelter": { type: "simple-marker", style: "square", size: 9, color: "#1baf7a", outline: { color: "white", width: 1.5 } }
      };
      P.geo.facilities.forEach((f) => facilitiesLayer.add(new Graphic({
        geometry: { type: "point", x: f.lon, y: f.lat, spatialReference: sr },
        symbol: facSym[f.type], attributes: f,
        popupTemplate: { title: "{name}", content: "{type}" }
      })));

      const map = new EsriMap({ layers: [base, heatLayer, overlay, facilitiesLayer] });
      mapView = new MapView({
        container: "mapView", map,
        spatialReference: { wkid: 3857 },
        background: { color: [238, 241, 244, 1] },
        constraints: { snapToZoom: false, minScale: 1500000, maxScale: 20000 },
        ui: { components: ["zoom"] },
        popup: { dockEnabled: false }
      });

      const STOPS = [
        { ratio: 0, color: "rgba(253,231,211,0)" },
        { ratio: 0.08, color: "rgba(253,231,211,0.55)" },
        { ratio: 0.25, color: "rgba(248,169,107,0.75)" },
        { ratio: 0.5, color: "rgba(235,104,52,0.85)" },
        { ratio: 0.75, color: "rgba(194,65,12,0.9)" },
        { ratio: 1, color: "rgba(124,45,18,0.95)" }
      ];
      setMapField = (field) => heatmapCreator.createRenderer({ layer: heatLayer, view: mapView, field })
        .then((res) => {
          const r = res.renderer;
          r.colorStops = STOPS;
          r.radius = 14;
          heatLayer.renderer = r;
        })
        .catch((e) => console.warn("Heat map renderer failed", e));

      mapView.when(() => mapView.goTo({ target: base.graphics.getItemAt(0).geometry.extent.clone().expand(1.08) }, { animate: false }))
        .then(() => heatLayer.when())
        .then(() => setMapField($("mapIndicator").value))
        .catch((e) => { console.error(e); msg("Map failed to load."); });

      $("mapIndicator").onchange = (e) => setMapField && setMapField(e.target.value);
      $("mapFacilities").onchange = (e) => (facilitiesLayer.visible = e.target.checked);
    }, (err) => msg("Map modules failed to load: " + (err && err.message)));
  }

  /* ------------------------------------------------------------------ PDF */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function exportPdf() {
    if (!window.html2pdf) { alert("The PDF library did not load. Try reloading the page, or use your browser's Print → Save as PDF."); return; }
    const btn = $("btnPdf");
    btn.disabled = true;
    $("pdfOverlay").hidden = false;
    const snap = $("mapSnapshot");
    const mapDiv = $("mapView");
    try {
      // 1. Swap the live WebGL map for a static screenshot (html2canvas can't read WebGL)
      if (mapView && mapView.ready) {
        try {
          const shot = await mapView.takeScreenshot({ format: "png" });
          snap.src = shot.dataUrl;
          await (snap.decode ? snap.decode().catch(() => {}) : Promise.resolve());
          snap.hidden = false;
          mapDiv.style.visibility = "hidden";
        } catch (e) { console.warn("Map screenshot failed", e); }
      }
      // 2. Fixed-width layout for a consistent PDF on any screen
      document.body.classList.add("pdf-export");
      Object.values(charts).forEach((c) => { c.options.animation = false; c.resize(); c.update("none"); });
      await wait(250);

      const fname = `${P.county.name.replace(/\s+/g, "_")}_EM_Profile.pdf`;
      await html2pdf().set({
        margin: [0.35, 0.3, 0.45, 0.3],
        filename: fname,
        image: { type: "jpeg", quality: 0.94 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#f4f3ef", windowWidth: 1160, scrollX: 0, scrollY: 0, logging: false },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          before: ["#sec-vuln", "#sec-history", "#sec-pa", "#sec-ia", "#sec-grants", "#sec-risk"],
          avoid: [".card", ".kpi", ".hero", ".kpi-row", ".kpi-grid", "tr", ".waffle-card"]
        }
      }).from($("profile")).toPdf().get("pdf").then((pdf) => {
        const n = pdf.internal.getNumberOfPages();
        const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
        for (let i = 1; i <= n; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(120);
          pdf.text(`${P.county.name}, ${P.county.state} — Emergency Management Profile (fictional demo data)`, 0.3, h - 0.2);
          pdf.text(`Page ${i} of ${n}`, w - 0.3, h - 0.2, { align: "right" });
        }
      }).save();
    } catch (e) {
      console.error(e);
      alert("PDF export failed: " + (e && e.message ? e.message : e));
    } finally {
      document.body.classList.remove("pdf-export");
      Object.values(charts).forEach((c) => { c.options.animation = { duration: 500 }; c.resize(); });
      snap.hidden = true;
      mapDiv.style.visibility = "";
      $("pdfOverlay").hidden = true;
      btn.disabled = false;
    }
  }
  $("btnPdf").onclick = exportPdf;

  /* ------------------------------------------------------------------ BOOT */
  setupChartDefaults();
  startAuth();
})();
