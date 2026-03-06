// -----------------------------
// Auth0 SPA Client Initialization
// -----------------------------
let auth0Client = null;

async function initAuth0() {
  if (!window.auth0 || typeof window.auth0.createAuth0Client !== 'function') {
    console.error(
      'Auth0 SDK not available – make sure the <script> tag for auth0-spa-js appears before app.js'
    );
    return;
  }

  if (location.protocol === 'file:') {
    console.warn(
      'Running from file://. Please serve these pages using HTTP/HTTPS.'
    );
  }

  auth0Client = await auth0.createAuth0Client({
    domain: "dev-28g3vd7ga8x6etvt.us.auth0.com",
    clientId: "vNYjFXq3DE4YKtUaekyKVPpCZqK4DNVa",
    authorizationParams: {
      audience: "https://teacherassistant-api"
    },
    skipRedirectCallback: true   // ⭐ THIS FIXES THE SIGNUP PAGE
  });
}

initAuth0();

// -----------------------------
// Start Signup → Auth0 Login
// -----------------------------
async function startSignup() {
  if (!auth0Client) {
    console.error("Auth0 client not initialized yet.");
    return;
  }

  await auth0Client.loginWithRedirect({
    authorizationParams: {
      screen_hint: "signup",
      redirect_uri: "https://www.teacherassist.ai/after-login.html"
    }
  });
}

// Make available to inline onclick=""
window.startSignup = startSignup;

// -----------------------------
// Auth0 User Helper
// -----------------------------
async function getUser() {
  if (!auth0Client) {
    await initAuth0();
  }

  const claims = await auth0Client.getIdTokenClaims();
  const user = await auth0Client.getUser();

  return {
    ...user,
    idToken: claims.__raw
  };
}

// Expose globally for after-login.html
window.getUser = getUser;
window.initAuth0 = initAuth0;
window.auth0Client = auth0Client;
