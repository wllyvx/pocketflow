import type { MiddlewareHandler } from "hono";

export type AuthVariables = {
  userId: string;
};

type AuthBindings = {
  DEV_AUTH_TOKEN: string;
};

export const requireAuth: MiddlewareHandler<{ Bindings: AuthBindings; Variables: AuthVariables }> = async (context, next) => {
  const authorization = context.req.header("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token || token !== context.env.DEV_AUTH_TOKEN) {
    return context.json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "A valid bearer token is required." },
    }, 401);
  }

  context.set("userId", "local-development-user");
  await next();
};
