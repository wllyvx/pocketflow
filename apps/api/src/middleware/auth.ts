import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthVariables = {
  userId: string;
  auth0Id: string;
  email?: string;
  name?: string;
};

type AuthBindings = {
  DEV_AUTH_TOKEN?: string;
  AUTH0_DOMAIN?: string;
  AUTH0_AUDIENCE?: string;
};

type AuthClaims = {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getIssuer(domain: string) {
  return domain.startsWith("https://") ? `${domain}/` : `https://${domain}/`;
}

export const requireAuth: MiddlewareHandler<{ Bindings: AuthBindings; Variables: AuthVariables }> = async (context, next) => {
  const authorization = context.req.header("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const isLocalToken = Boolean(token && context.env.DEV_AUTH_TOKEN && token === context.env.DEV_AUTH_TOKEN);

  if (isLocalToken) {
    context.set("auth0Id", "local-development-user");
    context.set("userId", "local-development-user");
    context.set("email", "local@example.com");
    context.set("name", "Local Development User");
    await next();
    return;
  }

  if (!token || !context.env.AUTH0_DOMAIN || !context.env.AUTH0_AUDIENCE) {
    return context.json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "A valid Auth0 bearer token is required." },
    }, 401);
  }

  try {
    const issuer = getIssuer(context.env.AUTH0_DOMAIN);
    let jwks = jwksByIssuer.get(issuer);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));
      jwksByIssuer.set(issuer, jwks);
    }

    const { payload } = await jwtVerify<AuthClaims>(token, jwks, {
      issuer,
      audience: context.env.AUTH0_AUDIENCE,
    });

    context.set("auth0Id", payload.sub);
    context.set("userId", payload.sub);
    context.set("email", payload.email);
    context.set("name", payload.name ?? ([payload.given_name, payload.family_name].filter(Boolean).join(" ") || payload.email));
  } catch {
    return context.json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "The Auth0 token is invalid or expired." },
    }, 401);
  }

  await next();
};
