/*
 * ArcGIS OAuth 2.0 + PKCE for the Cedar practice profile.
 * Pattern adapted from RESL_Kanban/src/auth.js:
 *   - standalone page: authorization-code redirect and callback exchange
 *   - embedded page: popup authorization, then post the code to the parent
 *   - keep the short-lived access token and refresh it when needed
 */
(() => {
  'use strict';

  // Copy the Client ID from your ArcGIS OAuth app into the value below.
  // Never put the OAuth client secret or a temporary token in browser code.
  const CLIENT_ID = 'hN0QCOV06sz2er5f';
  const AUTHORIZE_URL = 'https://www.arcgis.com/sharing/rest/oauth2/authorize';
  const TOKEN_URL = 'https://www.arcgis.com/sharing/rest/oauth2/token';
  const DATA_PORTAL = 'https://tnema.maps.arcgis.com';
  const ITEM_ID = '0441cfa9730046399811c27c309214ce';
  const TOKEN_KEY = 'county_profile_arcgis_token_v1';
  const VERIFIER_KEY = 'county_profile_oauth_verifier';
  const STATE_KEY = 'county_profile_oauth_state';
  const TOKEN_MINUTES = 20160;
  const REDIRECT_URI = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  const CALLBACK_MESSAGE = 'county_profile_oauth_callback';

  const profile = window.PROFILE_DATA;
  const gate = document.getElementById('arcgis-gate');
  const status = document.getElementById('arcgis-status');
  const signInButton = document.getElementById('arcgis-sign-in');
  let token = null;
  let dashboardStarted = false;

  const say = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('error', error);
  };
  const isEmbedded = () => {
    try { return window.self !== window.top; } catch (_) { return true; }
  };
  const clearAuthParams = () => history.replaceState({}, '', window.location.pathname + window.location.hash);

  function base64Url(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function randomString(byteLength) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  async function makeAuthorizeUrl() {
    const verifier = randomString(48);
    const state = randomString(16);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = base64Url(new Uint8Array(digest));
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    const query = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      expiration: String(TOKEN_MINUTES),
      state
    });
    return { url: `${AUTHORIZE_URL}?${query.toString()}`, state };
  }

  async function exchangeCode(code) {
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error('The sign-in session expired before it returned. Please click Sign in and try again.');
    const form = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
      f: 'json'
    });
    const response = await fetch(TOKEN_URL, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok || result.error) {
      const detail = result.error?.details?.[0] || result.error?.message || 'ArcGIS could not complete sign-in.';
      throw new Error(detail);
    }
    if (!result.access_token) throw new Error('ArcGIS did not return an access token.');
    const now = Date.now();
    const fresh = {
      accessToken: result.access_token,
      refreshToken: result.refresh_token || (token && token.refreshToken) || null,
      expiresAt: now + (Number(result.expires_in) || 7200) * 1000,
      refreshExpiresAt: result.refresh_token_expires_in
        ? now + Number(result.refresh_token_expires_in) * 1000
        : (token && token.refreshExpiresAt) || null
    };
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    saveToken(fresh);
    return fresh;
  }

  function saveToken(value) {
    token = value;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(value));
  }

  function clearToken() {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
  }

  async function refreshToken() {
    if (!token?.refreshToken) throw new Error('Your ArcGIS sign-in expired. Please sign in again.');
    if (token.refreshExpiresAt && Date.now() >= token.refreshExpiresAt) {
      throw new Error('Your ArcGIS sign-in expired. Please sign in again.');
    }
    const form = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      f: 'json'
    });
    const response = await fetch(TOKEN_URL, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok || result.error || !result.access_token) {
      throw new Error(result.error?.message || 'Your ArcGIS sign-in expired. Please sign in again.');
    }
    const now = Date.now();
    const fresh = {
      accessToken: result.access_token,
      refreshToken: result.refresh_token || token.refreshToken,
      expiresAt: now + (Number(result.expires_in) || 7200) * 1000,
      refreshExpiresAt: result.refresh_token_expires_in
        ? now + Number(result.refresh_token_expires_in) * 1000
        : token.refreshExpiresAt
    };
    saveToken(fresh);
    return fresh;
  }

  async function validAccessToken() {
    const stored = token || JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
    if (!stored?.accessToken) throw new Error('Please sign in to ArcGIS.');
    token = stored;
    if (Date.now() < stored.expiresAt - 60000) return stored.accessToken;
    return (await refreshToken()).accessToken;
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
  function findField(row, names) {
    for (const name of names) {
      const match = Object.entries(row).find(([key]) => normalize(key) === normalize(name));
      if (match && match[1] !== '') return match[1];
    }
    return undefined;
  }

  async function requestJson(url, accessToken) {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}f=json&token=${encodeURIComponent(accessToken)}`);
    if (!response.ok) throw new Error(`ArcGIS returned HTTP ${response.status}.`);
    const result = await response.json();
    if (result.error) throw new Error(result.error.message || 'ArcGIS could not return the requested data.');
    return result;
  }

  async function readRows(item, accessToken) {
    if (item.type === 'CSV') {
      const url = `${DATA_PORTAL}/sharing/rest/content/items/${ITEM_ID}/data?token=${encodeURIComponent(accessToken)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not download the ArcGIS CSV (HTTP ${response.status}).`);
      return parseCsv(await response.text());
    }
    if (!item.url || !/Feature Service|Feature Layer|Table/i.test(item.type || '')) {
      throw new Error(`This ArcGIS item is “${item.type || 'unknown type'}”. Use a CSV item or publish it as a hosted feature layer/table.`);
    }
    let layerUrl = item.url.replace(/\/$/, '');
    if (!/\/(FeatureServer|MapServer)\/\d+$/i.test(layerUrl)) {
      const service = await requestJson(layerUrl, accessToken);
      const layer = (service.layers || [])[0] || (service.tables || [])[0];
      if (!layer) throw new Error('The ArcGIS service has no readable layer or table.');
      layerUrl += `/${layer.id}`;
    }
    const query = new URLSearchParams({ where: '1=1', outFields: '*', returnGeometry: 'false', resultRecordCount: '2000', f: 'json', token: accessToken });
    const response = await fetch(`${layerUrl}/query?${query.toString()}`);
    if (!response.ok) throw new Error(`Could not read the ArcGIS table (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.error) throw new Error(result.error.message || 'ArcGIS could not return county records.');
    return (result.features || []).map(feature => feature.attributes || {});
  }

  function selectCountyRow(rows) {
    if (!rows.length) throw new Error('The ArcGIS item returned no county rows.');
    const countyFields = ['county', 'county_name', 'name', 'geography', 'namelsad'];
    const wanted = normalize(profile.county);
    const found = rows.find(row => normalize(findField(row, countyFields)) === wanted);
    if (found) return found;
    if (rows.length === 1) return rows[0];
    throw new Error(`The table has ${rows.length} rows but none matches “${profile.county}”. Match the profile county name or limit the ArcGIS item to one county.`);
  }

  function mergeFacts(row) {
    const fields = {
      population: ['population', 'total_population', 'pop_total', 'popestimate', 'b01003_001e'],
      households: ['households', 'total_households', 'household_count', 'b11001_001e'],
      median_household_income: ['median_household_income', 'median_income', 'med_hh_income', 'b19013_001e']
    };
    let count = 0;
    for (const [target, names] of Object.entries(fields)) {
      const raw = findField(row, names);
      if (raw === undefined) continue;
      const value = Number(String(raw).replace(/[$,%\s,]/g, ''));
      if (Number.isFinite(value)) { profile.facts[target] = value; count += 1; }
    }
    if (!count) throw new Error(`County row found, but no population, households, or median income field matched. ArcGIS fields: ${Object.keys(row).join(', ')}.`);
  }

  async function loadDashboard() {
    if (dashboardStarted) return;
    dashboardStarted = true;
    say('Loading county facts from ArcGIS…');
    const accessToken = await validAccessToken();
    const item = await requestJson(`${DATA_PORTAL}/sharing/rest/content/items/${ITEM_ID}`, accessToken);
    mergeFacts(selectCountyRow(await readRows(item, accessToken)));

    const renderer = document.createElement('script');
    renderer.src = 'assets/dashboard.js';
    renderer.onload = () => {
      gate.remove();
      document.body.classList.add('arcgis-ready');
      document.getElementById('download-pdf')?.addEventListener('click', () => window.print());
    };
    renderer.onerror = () => {
      dashboardStarted = false;
      signInButton.disabled = false;
      say('Could not load the dashboard renderer. Check that docs/assets/dashboard.js is present.', true);
    };
    document.body.appendChild(renderer);
  }

  function handlePopupCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    if ((!code && !error) || !window.opener || window.opener === window) return false;
    window.opener.postMessage({
      type: CALLBACK_MESSAGE,
      code,
      state: params.get('state'),
      error,
      errorDescription: params.get('error_description')
    }, window.location.origin);
    window.close();
    return true;
  }

  function waitForPopup(popup, expectedState) {
    return new Promise((resolve, reject) => {
      let timer;
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        window.clearInterval(timer);
      };
      const onMessage = async event => {
        if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== CALLBACK_MESSAGE) return;
        cleanup();
        if (event.data.state !== expectedState || sessionStorage.getItem(STATE_KEY) !== expectedState) {
          reject(new Error('ArcGIS sign-in state did not match. Please try signing in again.'));
          return;
        }
        if (event.data.error) {
          reject(new Error(event.data.errorDescription || 'ArcGIS sign-in was declined.'));
          return;
        }
        try { await exchangeCode(event.data.code); resolve(); }
        catch (error) { reject(error); }
      };
      window.addEventListener('message', onMessage);
      timer = window.setInterval(() => {
        if (popup.closed) { cleanup(); reject(new Error('The ArcGIS sign-in window was closed before authorization finished.')); }
      }, 500);
    });
  }

  async function signIn() {
    if (CLIENT_ID.includes('PASTE_')) {
      say('Add your ArcGIS Client ID in this file before signing in.', true);
      return;
    }
    signInButton.disabled = true;
    say('Connecting to ArcGIS…');
    let popup = null;
    try {
      if (isEmbedded()) {
        // Open synchronously from the click so the browser can allow the popup.
        popup = window.open('about:blank', 'county_profile_arcgis_login', 'width=540,height=720,scrollbars=yes');
        if (!popup) throw new Error('The sign-in popup was blocked. Allow popups for this site or open the profile in a new tab.');
      }
      const auth = await makeAuthorizeUrl();
      if (popup) {
        const completed = waitForPopup(popup, auth.state);
        popup.location.href = auth.url;
        await completed;
      } else {
        window.location.assign(auth.url);
        return;
      }
      await loadDashboard();
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      signInButton.disabled = false;
      sessionStorage.removeItem(VERIFIER_KEY);
      sessionStorage.removeItem(STATE_KEY);
      say(error.message || 'ArcGIS sign-in failed.', true);
    }
  }

  async function initialize() {
    if (handlePopupCallback()) return;
    if (CLIENT_ID.includes('PASTE_')) {
      say('Add your ArcGIS Client ID in docs/assets/arcgis-connect.js, then publish the change.', true);
      return;
    }
    signInButton.addEventListener('click', signIn);

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    if (error) {
      clearToken();
      clearAuthParams();
      say(error === 'access_denied' ? 'ArcGIS sign-in was declined. Click Sign in with ArcGIS and approve the request to continue.' : `ArcGIS sign-in error: ${params.get('error_description') || error}`, true);
      return;
    }
    if (code) {
      try {
        if (params.get('state') !== sessionStorage.getItem(STATE_KEY)) throw new Error('The ArcGIS sign-in state did not match. Please try again.');
        await exchangeCode(code);
        clearAuthParams();
      } catch (error) {
        clearToken();
        clearAuthParams();
        say(error.message || 'Could not finish ArcGIS sign-in. Please try again.', true);
        return;
      }
    }

    const stored = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
    if (stored?.accessToken) {
      token = stored;
      try { await loadDashboard(); }
      catch (error) {
        dashboardStarted = false;
        signInButton.disabled = false;
        say(`${error.message || 'Could not load the county profile.'} Check your ArcGIS item access and field names.`, true);
      }
    } else {
      say('Sign in with your ArcGIS account to load the county facts.');
    }
  }

  initialize().catch(error => {
    signInButton.disabled = false;
    say(error.message || 'Could not initialize the ArcGIS connection.', true);
  });
})();
