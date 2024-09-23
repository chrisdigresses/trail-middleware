import { NextRequest, NextResponse } from "next/server";
import {
  withTrailMiddleware,
  MiddlewareFunction,
  SetupFunction,
} from "./index";

describe("withTrailMiddleware", () => {
  let middlewareThatReturnsNextMock: MiddlewareFunction;
  let middlewareThatReturnsRedirectMock: MiddlewareFunction;
  let middlewareThatReturnsUndefinedMock: MiddlewareFunction;

  beforeEach(() => {
    middlewareThatReturnsNextMock = jest
      .fn()
      .mockResolvedValue(NextResponse.next());
    middlewareThatReturnsRedirectMock = jest
      .fn()
      .mockResolvedValue(
        NextResponse.redirect(new URL("/redirect", "http://localhost")),
      );
    middlewareThatReturnsUndefinedMock = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const mockNextRequest = (pathname: string): NextRequest => {
    return {
      nextUrl: { pathname },
    } as NextRequest;
  };

  const mockNextResponse = (headers: Record<string, string>): NextResponse => {
    const response = new NextResponse();
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  };

  it("should call the correct middleware based on the route", async () => {
    const setup: SetupFunction = (trail) => {
      trail("/test", middlewareThatReturnsNextMock);
      trail("/test2", middlewareThatReturnsRedirectMock);
    };

    const middleware = withTrailMiddleware(setup);

    const requestToTestRoute = mockNextRequest("/test");
    await middleware(requestToTestRoute);
    expect(middlewareThatReturnsNextMock).toHaveBeenCalledWith(
      requestToTestRoute,
    );
    expect(middlewareThatReturnsNextMock).toHaveBeenCalledTimes(1);
    expect(middlewareThatReturnsRedirectMock).not.toHaveBeenCalled();

    const requestToTest2Route = mockNextRequest("/test2");
    await middleware(requestToTest2Route);
    expect(middlewareThatReturnsRedirectMock).toHaveBeenCalledWith(
      requestToTest2Route,
    );
    expect(middlewareThatReturnsRedirectMock).toHaveBeenCalledTimes(1);
  });

  it("should return NextResponse.next() if no middleware matches", async () => {
    const setup: SetupFunction = (trail) => {
      trail("/nomatch", middlewareThatReturnsNextMock);
    };

    const middleware = withTrailMiddleware(setup);

    const request = mockNextRequest("/test");
    const result = await middleware(request);

    expect(middlewareThatReturnsNextMock).not.toHaveBeenCalled();
    expect(result).toEqual(NextResponse.next());
  });

  it("should catch only one route in an array", async () => {
    const setup: SetupFunction = (trail) => {
      trail(["/test", "/test2"], middlewareThatReturnsNextMock);
    };

    const middleware = withTrailMiddleware(setup);
    const requestToTestRoute = mockNextRequest("/test");
    await middleware(requestToTestRoute);
    expect(middlewareThatReturnsNextMock).toHaveBeenCalledTimes(1);

    const middlewareTwo = withTrailMiddleware(setup);
    const requestToTest2Route = mockNextRequest("/test2");
    await middlewareTwo(requestToTest2Route);
    expect(middlewareThatReturnsNextMock).toHaveBeenCalledTimes(2);
  });

  it("should handle multiple middleware for the same route", async () => {
    const setup: SetupFunction = (trail) => {
      trail("/multi", [
        middlewareThatReturnsNextMock,
        middlewareThatReturnsRedirectMock,
      ]);
    };

    const middleware = withTrailMiddleware(setup);
    const request = mockNextRequest("/multi");

    const result = await middleware(request);

    expect(middlewareThatReturnsNextMock).toHaveBeenCalledWith(request);
    expect(middlewareThatReturnsRedirectMock).toHaveBeenCalledWith(request);
    expect(result).toEqual(
      NextResponse.redirect(new URL("/redirect", "http://localhost")),
    );
  });

  it("should stop processing middleware if a middleware does not return NextResponse.next()", async () => {
    const middleware1: MiddlewareFunction = jest
      .fn()
      .mockResolvedValue(mockNextResponse({}));
    const middleware2: MiddlewareFunction = jest
      .fn()
      .mockResolvedValue(mockNextResponse({ "x-middleware-next": "1" }));

    const setup: SetupFunction = (trail) => {
      trail("/test", [middleware1, middleware2]);
    };

    const middleware = withTrailMiddleware(setup);
    const request = mockNextRequest("/test");

    const result = await middleware(request);

    expect(middleware1).toHaveBeenCalledWith(request);
    expect(middleware2).not.toHaveBeenCalled();
  });

  it("should return NextResponse.next() if middleware does not return a response", async () => {
    const setup: SetupFunction = (trail) => {
      trail("/test", middlewareThatReturnsUndefinedMock);
    };

    const middleware = withTrailMiddleware(setup);
    const request = mockNextRequest("/test");

    const result = await middleware(request);

    expect(middlewareThatReturnsUndefinedMock).toHaveBeenCalledWith(request);
    expect(result).toEqual(NextResponse.next());
  });
});
