/* ArcGIS sign-in and county-facts loader for the practice profile. */
(() => {
  'use strict';

  // Paste your ArcGIS application's Client ID between the quotes below.
  // Do not paste a client secret or temporary token here.
  const CLIENT_ID = 'PASTE_ARCGIS_CLIENT_ID_HERE';
  const PORTAL_URL = 'https://tnema.maps.arcgis.com';
  const ITEM_ID = '0441cfa9730046399811c27c309214ce';
  const profile = window.PROFILE_DATA;
  const gate = document.getElementById('arcgis-gate');
  const status = document.getElementById('arcgis-status');
  const signInButton = document.getElementById('arcgis-sign-in');
  const say = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('error', error);
  };

  function loadArcGISModules() {
    return new Promise((resolve, reject) => {
      const ready = () => window.require(
        ['esri/identity/OAuthInfo', 'esri/identity/IdentityManager'],
        (OAuthInfo, identityManager) => resolve({ OAuthInfo, identityManager })
      );
      if (window.require) { ready(); return; }
      const script = document.createElement('script');
      script.src = 'https://js.arcgis.com/4.34/';
      script.onload = ready;
      script.onerror = () => reject(new Error('ArcGIS sign-in support did not load. Check your internet connection.'));
      document.head.appendChild(script);
    });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && text[i + 1] === '\n') i += 1;
        row.push(cell); cell = '';
        if (row.some(value => value !== '')) rows.push(row);
        row = [];
      } else cell += ch;
    }
    row.push(cell);
    if (row.some(value => value !== '')) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows.shift().map(value => value.replace(/^\uFEFF/, '').trim());
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function field(row, names) {
    for (const name of names) {
      const found = Object.entries(row).find(([key]) => normalize(key) === normalize(name));
      if (found && found[1] !== '') return found[1];
    }
    return undefined;
  }

  async function requestJson(url, token) {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}f=json&token=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error(`ArcGIS returned HTTP ${response.status}.`);
    const result = await response.json();
    if (result.error) throw new Error(result.error.message || 'ArcGIS could not return that item.');
    return result;
  }

  async function getRows(item, token) {
    if (item.type === 'CSV') {
      const response = await fetch(`${PORTAL_URL}/sharing/rest/content/items/${ITEM_ID}/data?token=${encodeURIComponent(token)}`);
      if (!response.ok) throw new Error(`Could not download the ArcGIS CSV (HTTP ${response.status}).`);
      return parseCsv(await response.text());
    }
    if (!item.url || !/Feature Service|Feature Layer|Table/i.test(item.type || '')) {
      throw new Error(`This ArcGIS item is “${item.type || 'unknown type'}”. Use a CSV item or publish it as a hosted feature layer/table.`);
    }
    let layerUrl = item.url.replace(/\/$/, '');
    if (!/\/(FeatureServer|MapServer)\/\d+$/i.test(layerUrl)) {
      const service = await requestJson(layerUrl, token);
      const layer = (service.layers || [])[0] || (service.tables || [])[0];
      if (!layer) throw new Error('The ArcGIS service does not contain a readable layer or table.');
      layerUrl += `/${layer.id}`;
    }
    const query = new URLSearchParams({ where: '1=1', outFields: '*', returnGeometry: 'false', resultRecordCount: '2000', f: 'json', token });
    const response = await fetch(`${layerUrl}/query?${query.toString()}`);
    if (!response.ok) throw new Error(`Could not read the ArcGIS table (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.error) throw new Error(result.error.message || 'ArcGIS could not return the county rows.');
    return (result.features || []).map(feature => feature.attributes || {});
  }

  function selectRow(rows) {
    if (!rows.length) throw new Error('The ArcGIS item returned no rows.');
    const countyNames = ['county', 'county_name', 'name', 'geography', 'namelsad'];
    const target = normalize(profile.county);
    const match = rows.find(row => normalize(field(row, countyNames)) === target);
    if (match) return match;
    if (rows.length === 1) return rows[0];
    throw new Error(`The table has ${rows.length} rows and no row matches “${profile.county}”. Set the profile county name or narrow the ArcGIS table to the county you want.`);
  }

  function updateProfile(row) {
    const mappings = {
      population: ['population', 'total_population', 'pop_total', 'popestimate', 'b01003_001e'],
      households: ['households', 'total_households', 'household_count', 'b11001_001e'],
      median_household_income: ['median_household_income', 'median_income', 'med_hh_income', 'b19013_001e']
    };
    let updated = 0;
    for (const [target, candidates] of Object.entries(mappings)) {
      const raw = field(row, candidates);
      if (raw === undefined) continue;
      const value = Number(String(raw).replace(/[$,%\s,]/g, ''));
      if (Number.isFinite(value)) { profile.facts[target] = value; updated += 1; }
    }
    if (!updated) throw new Error(`The row was found but its field names did not match population, households, or median income. Returned fields: ${Object.keys(row).join(', ')}.`);
  }

  async function signInAndRender() {
    if (CLIENT_ID.includes('PASTE_')) {
      say('First replace PASTE_ARCGIS_CLIENT_ID_HERE in this file with your ArcGIS Client ID, then commit the change.', true);
      return;
    }
    signInButton.disabled = true;
    say('Connecting to ArcGIS…');
    try {
      const { OAuthInfo, identityManager } = await loadArcGISModules();
      identityManager.registerOAuthInfos([new OAuthInfo({
        appId: CLIENT_ID,
        portalUrl: PORTAL_URL,
        popup: false,
        flowType: 'auto'
      })]);
      let credential;
      try { credential = await identityManager.checkSignInStatus(`${PORTAL_URL}/sharing`); }
      catch (_) { credential = await identityManager.getCredential(`${PORTAL_URL}/sharing`); }

      say('Reading county facts from ArcGIS…');
      const item = await requestJson(`${PORTAL_URL}/sharing/rest/content/items/${ITEM_ID}`, credential.token);
      updateProfile(selectRow(await getRows(item, credential.token)));

      const renderer = document.createElement('script');
      renderer.src = 'assets/dashboard.js';
      renderer.onload = () => {
        gate.remove();
        document.body.classList.add('arcgis-ready');
        document.getElementById('download-pdf').addEventListener('click', () => window.print());
      };
      renderer.onerror = () => {
        signInButton.disabled = false;
        say('Could not load docs/assets/dashboard.js. Check that the existing dashboard renderer is in place.', true);
      };
      document.body.appendChild(renderer);
    } catch (error) {
      signInButton.disabled = false;
      say(`${error.message || 'ArcGIS connection failed.'} Check the registered redirect URL and your access to the ArcGIS item.`, true);
    }
  }

  signInButton.addEventListener('click', signInAndRender);
})();
