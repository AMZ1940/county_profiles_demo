/* This file renders the fictional practice profile from data embedded in docs/index.html. */
(() => {
  const d = window.PROFILE_DATA;
  const byId = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = value => Number(value).toLocaleString('en-US');
  const money = value => '$' + (Number(value) / 1000000).toFixed(2).replace(/0+$/,'').replace(/\.$/,'') + 'M';
  const pct = value => Number(value).toFixed(1) + '%';
  const paTotal = d.pa_categories.reduce((sum, row) => sum + row.amount, 0);
  const iaTotal = d.disasters.reduce((sum, row) => sum + row.ia, 0);
  const grantsTotal = d.grants.reduce((sum, row) => sum + row.amount, 0);
  byId('county-name').textContent = d.county;
  byId('description').textContent = d.description;
  byId('hero-population').textContent = n(d.facts.population);
  byId('as-of').textContent = d.as_of;

  const stats = [
    ['Population', n(d.facts.population), n(d.state_facts.population) + ' statewide'],
    ['Households', n(d.facts.households), n(d.state_facts.households) + ' statewide'],
    ['Median household income', '$' + n(d.facts.median_household_income), '$' + n(d.state_facts.median_household_income) + ' statewide']
  ];
  byId('stat-grid').innerHTML = stats.map(([label, value, state]) => `<div class="stat-card"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong><span class="stat-compare">${esc(d.state)}: <b>${esc(state.replace(' statewide',''))}</b></span></div>`).join('');

  byId('indicator-chart').innerHTML = d.indicators.map(row => {
    const countyWidth = Math.min(100, row.county * 2);
    const stateWidth = Math.min(100, row.state * 2);
    return `<div class="indicator-row"><div class="indicator-label"><strong>${esc(row.label)}</strong><small>${esc(row.note)}</small></div><div class="paired-bars" aria-label="County ${pct(row.county)}, state ${pct(row.state)}"><i class="county" style="width:${countyWidth}%"></i><i class="state" style="width:${stateWidth}%"></i></div><div class="indicator-values"><b>${pct(row.county)}</b><span>${pct(row.state)}</span></div></div>`;
  }).join('');
  const above = [...d.indicators].sort((a,b) => (b.county-b.state) - (a.county-a.state)).slice(0,3);
  byId('indicator-insights').innerHTML = above.map(row => `<div class="insight-item"><strong>+${(row.county-row.state).toFixed(1)} pp</strong><span>${esc(row.label)} in the county compared with ${esc(d.state)}</span></div>`).join('');

  const heatColors = ['#fff1ef','#ffd7d2','#f7a99f','#e97068','#c83b43','#8e1b2c'];
  byId('heat-grid').innerHTML = d.zones.map(zone => {
    const level = Math.max(0, Math.min(5, Math.floor((zone.score - 18) / 5)));
    const light = level < 4;
    return `<div class="heat-cell" tabindex="0" title="${esc(zone.name)}: ${zone.score}% modeled score; ${n(zone.population)} residents" style="background:${heatColors[level]};color:${light ? '#15344a' : '#fff'}"><strong>${esc(zone.name)}</strong><span>${zone.score}%</span></div>`;
  }).join('');
  const hottest = [...d.zones].sort((a,b) => b.score-a.score)[0];
  const scores = d.zones.map(z => z.score);
  byId('hot-zone').textContent = `${hottest.name} has the highest modeled support-needs share (${hottest.score}%) in this invented zone dataset. In a real drill, this would be a starting point for verifying outreach routes and resource access.`;
  byId('heat-range').textContent = `${Math.min(...scores)}%–${Math.max(...scores)}%`;

  byId('event-timeline').innerHTML = [...d.disasters].reverse().map(row => `<div class="event"><div class="event-year">${row.year}</div><div class="event-content"><h4>${esc(row.type)}</h4><p class="event-meta">${row.duration_days} day${row.duration_days === 1 ? '' : 's'} of primary incident activity</p><p>${esc(row.impact)}</p></div></div>`).join('');
  const biggestEvent = Math.max(...d.disasters.map(row => row.pa + row.ia));
  byId('event-awards').innerHTML = d.disasters.map(row => `<div class="award-row"><div class="award-row-top"><span>${row.year} · ${esc(row.type)}</span><strong>${money(row.pa + row.ia)}</strong></div><div class="award-track" aria-label="PA ${money(row.pa)}, IA ${money(row.ia)}"><span class="pa" style="width:${row.pa / biggestEvent * 100}%"></span><span class="ia" style="width:${row.ia / biggestEvent * 100}%"></span></div></div>`).join('');

  byId('funding-totals').innerHTML = [
    ['Public Assistance', paTotal, 'Public infrastructure and response'],
    ['Individual Assistance', iaTotal, 'Household support'],
    ['Other grants', grantsTotal, 'Prevention and readiness projects']
  ].map(([label, value, detail]) => `<div class="funding-total"><span>${esc(label)}</span><strong>${money(value)}</strong><small>${esc(detail)}</small></div>`).join('');
  const biggestCategory = Math.max(...d.pa_categories.map(row => row.amount));
  byId('pa-chart').innerHTML = d.pa_categories.map(row => `<div class="pa-row"><span class="pa-code">${esc(row.code)}</span><span>${esc(row.name)}</span><div class="pa-track"><span class="pa-fill" style="width:${row.amount / biggestCategory * 100}%"></span></div><span class="pa-amount">${money(row.amount)}</span></div>`).join('');
  byId('grant-list').innerHTML = d.grants.map(row => `<div class="grant-item"><div class="grant-top"><strong>${esc(row.short)} · ${esc(row.name)}</strong><span class="grant-amount">${money(row.amount)}</span></div><p>${esc(row.purpose)}</p><small>Award year ${row.year}</small></div>`).join('');

  byId('risk-chart').innerHTML = d.hazards.map(row => `<div class="risk-row"><div class="risk-label"><strong>${esc(row.type)}</strong><small>${esc(row.likelihood)} scenario likelihood</small></div><div class="risk-track" aria-label="Index ${row.score} out of 100"><span class="risk-fill" style="width:${row.score}%"></span></div><span class="risk-score">${row.score}</span></div>`).join('');
  const top = [...d.hazards].sort((a,b) => b.score-a.score)[0];
  byId('top-risk').innerHTML = `<div class="big-risk">${top.score}<span style="font-size:17px;color:#71939b"> / 100</span></div><h3>${esc(top.type)}</h3><span class="likelihood-pill">${esc(top.likelihood)} scenario likelihood</span><p>${esc(top.driver)}.</p>`;
})();
