import { createAuth0Client, type Auth0Client } from "@auth0/auth0-spa-js";

let authClient: Promise<Auth0Client> | undefined;

export function getAuthClient(): Promise<Auth0Client> {
  if (!authClient) {
    authClient = createAuth0Client({
      domain: import.meta.env.PUBLIC_AUTH0_DOMAIN,
      clientId: import.meta.env.PUBLIC_AUTH0_CLIENT_ID,
      authorizationParams: {
        audience: import.meta.env.PUBLIC_AUTH0_AUDIENCE,
        redirect_uri: window.location.origin,
      },
      cacheLocation: "localstorage",
    });
  }
  return authClient;
}