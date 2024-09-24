import { NextRequest, NextResponse } from "next/server";
import { match } from "path-to-regexp";

export type MiddlewareFunction = (
  req: NextRequest,
  next: () => void,
) =>
  | Promise<NextResponse<unknown>>
  | NextResponse<unknown>
  | Promise<void>
  | void;
export type SetupFunction = (
  trail: TrailFunction,
  req: NextRequest | null,
) => void;
export type TrailFunction = (
  path: string | string[],
  func: MiddlewareFunction | MiddlewareFunction[],
) => void;
type MiddlewareCollection = Array<{
  routes: string[];
  middleware: MiddlewareFunction[];
}>;

let middlewareCollection: MiddlewareCollection = [];

export const withTrailMiddleware = (setup: SetupFunction) => {
  const saveMiddlewareGroup: TrailFunction = (
    routes: string | string[],
    middleware: MiddlewareFunction | MiddlewareFunction[],
  ) => {
    const routesArray = Array.isArray(routes) ? routes : [routes];
    const middlewareArray = Array.isArray(middleware)
      ? middleware
      : [middleware];
    middlewareCollection.push({
      routes: routesArray,
      middleware: middlewareArray,
    });
  };

  // This is the actual middleware function that will be called by Next.js
  return async (req: NextRequest) => {
    setup(saveMiddlewareGroup, null);

    let middlewareResult:
      | Promise<NextResponse<unknown>>
      | NextResponse<unknown>
      | Promise<void>
      | void;

    for (const middlewareGroup of middlewareCollection) {
      for (const route of middlewareGroup.routes) {
        const isMatch = match(route);
        const matchResult = isMatch(req.nextUrl.pathname);

        if (matchResult) {
          for (const middleware of middlewareGroup.middleware) {
            let nextCalled = false;
            middlewareResult = await middleware(req, () => {
              nextCalled = true;
            });

            if (nextCalled) {
              continue;
            } else if (middlewareResult) {
              middlewareCollection = [];
              return middlewareResult;
            } else {
              middlewareCollection = [];
              throw new Error(
                "Middleware did not complete gracefully. Return a NextResponse or call the next() callback.",
              );
            }
          }

          // Once a route is matched, we don't need to check the rest
          // This prevents the supplied middleware from being called for
          // every matching route pattern.
          break;
        }
      }
    }
    middlewareCollection = [];
    return NextResponse.next();
  };
};
