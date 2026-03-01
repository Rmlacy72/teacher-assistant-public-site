// -----------------------------
// Auth0 SPA Client Initialization
// -----------------------------
let auth0Client = null;

async function initAuth0() {
  auth0Client = await createAuth0Client({
    domain: "dev-28g3vd7ga8x6etvt.us.auth0.com",
    clientId: "vNYjFXq3DE4YKtUaekyKVPpCZqK4DNVa",
    authorizationParams: {
      audience: "https://teacherassistant-api",
      redirect_uri: "https://teacherassist.ai/after-login.html"
    }
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
      redirect_uri: "https://teacherassist.ai/after-login.html"
    }
  });
}

// Make available to inline onclick=""
window.startSignup = startSignup;
