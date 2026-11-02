/*
 * ArcGIS OAuth 2.0 + PKCE sign-in gate for the Cedar practice profile.
 * County profile data stays in the published website; ArcGIS is used only
 * to sign in. Pattern adapted from RESL_Kanban/src/auth.js:
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
  const TOKEN_KEY = 'county_profile_arcgis_token_v1';
  const VERIFIER_KEY = 'county_profile_oauth_verifier';
  const STATE_KEY = 'county_profile_oauth_state';
  const TOKEN_MINUTES = 20160;
  const REDIRECT_URI = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  const CALLBACK_MESSAGE = 'county_profile_oauth_callback';

  const gate = document.getElementById('arcgis-gate');
  const status = document.getElementById('arcgis-status');
  const signInButton = document.getElementById('arcgis-sign-in');
  const description = gate.querySelector('p:not(#arcgis-status)');
  if (description) {
    description.textContent = 'Sign in with your ArcGIS account to view the county profile. Practice data is supplied by this website.';
  }
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

  async function loadDashboard() {
    if (dashboardStarted) return;
    dashboardStarted = true;
    say('ArcGIS sign-in complete. Loading the county profile…');
    await validAccessToken();

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
        say(`${error.message || 'Could not load the county profile.'} The profile data is read from the website, not from ArcGIS.`, true);
      }
    } else {
      say('Sign in with your ArcGIS account to view the county profile.');
    }
  }

  initialize().catch(error => {
    signInButton.disabled = false;
    say(error.message || 'Could not initialize the ArcGIS connection.', true);
  });
})();
