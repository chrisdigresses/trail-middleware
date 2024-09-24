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
  let middlewareThatCallsNextCallbackMock: MiddlewareFunction;

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
    middlewareThatCallsNextCallbackMock = jest
      .fn()
      .mockImplementation((req, next) => {
        next();
      });
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
      expect.any(Function),
    );
    expect(middlewareThatReturnsNextMock).toHaveBeenCalledTimes(1);
    expect(middlewareThatReturnsRedirectMock).not.toHaveBeenCalled();

    const requestToTest2Route = mockNextRequest("/test2");
    await middleware(requestToTest2Route);
    expect(middlewareThatReturnsRedirectMock).toHaveBeenCalledWith(
      requestToTest2Route,
      expect.any(Function),
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
      trail(
        ["/test/testroute", "/test/:route"],
        middlewareThatCallsNextCallbackMock,
      );
    };

    const middleware = withTrailMiddleware(setup);
    const requestToTestRoute = mockNextRequest("/test/testroute");
    await middleware(requestToTestRoute);
    expect(middlewareThatCallsNextCallbackMock).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple middleware for the same route", async () => {
    const setup: SetupFunction = (trail) => {
      trail("/multi", [
        middlewareThatCallsNextCallbackMock,
        middlewareThatReturnsRedirectMock,
      ]);
    };

    const middleware = withTrailMiddleware(setup);
    const request = mockNextRequest("/multi");

    const result = await middleware(request);

    expect(middlewareThatCallsNextCallbackMock).toHaveBeenCalledWith(
      request,
      expect.any(Function),
    );
    expect(middlewareThatReturnsRedirectMock).toHaveBeenCalledWith(
      request,
      expect.any(Function),
    );
    expect(result).toEqual(
      NextResponse.redirect(new URL("/redirect", "http://localhost")),
    );
  });

  it("should throw an error if middleware doesn't complete gracefully", async () => {
    const middlewareThatReturnsUndefined = jest.fn((req, next) => {
      // Middleware does not call next() and does not return a NextResponse
    });

    const setup: SetupFunction = (trail) => {
      trail("/test", middlewareThatReturnsUndefined);
    };

    const middleware = withTrailMiddleware(setup);
    const requestToTestRoute = new NextRequest(
      new URL("http://localhost/test"),
    );

    await expect(middleware(requestToTestRoute)).rejects.toThrow(
      new Error(
        "Middleware did not complete gracefully. Return a NextResponse or call the next() callback.",
      ),
    );
  });

  it("should continue to the next middleware if next() is called", async () => {
    const setup: SetupFunction = (trail) => {
      trail("/test", [
        middlewareThatCallsNextCallbackMock,
        middlewareThatCallsNextCallbackMock,
        middlewareThatReturnsRedirectMock,
      ]);
    };

    const middleware = withTrailMiddleware(setup);
    const request = mockNextRequest("/test");

    await middleware(request);

    expect(middlewareThatCallsNextCallbackMock).toHaveBeenCalledWith(
      request,
      expect.any(Function),
    );
    expect(middlewareThatCallsNextCallbackMock).toHaveBeenCalledTimes(2);
    expect(middlewareThatReturnsRedirectMock).toHaveBeenCalledWith(
      request,
      expect.any(Function),
    );
  });
});
