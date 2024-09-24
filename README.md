# Trail Middleware

Trail Middleware is a lightweight and efficient middleware wrapper for Next.js. It provides a simple interface to manage and organize your middleware.

> ⚠️ **Important**: This package is currently in an **experimental** stage. Please be aware that its API, functionality, and behavior are subject to change in upcoming releases. Use it cautiously in production environments, and keep track of updates to stay informed of breaking changes or enhancements.

## Features

- Easily integrates with your existing Next.js middleware
- Lightweight and minimalistic
- Customizable middleware stack

## Installation

You can install Trail Middleware using npm:

```bash
npm i trail-middleware
```

## Getting Started

### Basic Example

```javascript
import { withTrailMiddleware } from 'trail-middleware';

// Example middleware for logging request data
const const loggerMiddleware = (request: NextRequest, next) => {
  logger(`User Agent: ${req.headers.get('user-agent')}`);
  logger(`Path: ${req.nextUrl.pathname}`);
  next();
}

// Main Next.js middleware with TrailMiddleware wrapper
export const middleware = withTrailMiddleware((trail) => {
  // Use logger middleware on all routes
  trail('/*allroutes', loggerMiddleware);
});
```

### Multiple Routes and Middleware

Trail Middleware also supports multiple routes:

```javascript
// Example middleware for authenticating users
const authMiddleware = (request: NextRequest, next) {
  const cookie = req.cookies.get('jwt');

  if (cookie) {
    next();
  }

  return NextResponse.redirect(new URL('/login', req.nextUrl.href));
}

export const middleware = withTrailMiddleware((trail) => {
  // When any of these routes are visited, logger middleware
  // will be called
  trail(['/route-one', '/route-two'], authMiddleware);
});
```

and multiple middleware:

```javascript
export const middleware = withTrailMiddleware((trail) => {
  // When this route is visited, auth middleware and logger middleware
  // will both be called sequentially
  trail("/route-one", [authMiddleware, loggerMiddleware]);
});
```

### Organization

Instead of having everything in one monolithic file, easily organize your middleware into separate files:

```javascript
import { withTrailMiddleware } from "trail-middleware";

import { loggerMiddleware } from "./middleware/logger";
import { authMiddleware } from "./middleware/auth";

export const middleware = withTrailMiddleware((trail) => {
  // Use logger middleware on all routes
  trail("/*routes", loggerMiddleware);

  // Use auth middleware on protected routes
  trail("/protected/*routes", authMiddleware);

  // Etc...
});
```

### Creating Middleware
Middleware functions look nearly identical to the standard middleware export in Next.js, with one extra parameter: `next: () => void`. This callback tells Trail Middleware that this middleware has completed **and** that it should continue processing the next middleware in line.

#### Middleware using `next()`:
```javascript
const middlewareOne = (req: NextRequest, next: () => void) => {
  // Your middleware logic...

  next(); // Continue to next middleware (middlewareTwo)
}

export const middleware = withTrailMiddleware((trail, req) => {
  trail(["/login"], [middlewareOne, middlewareTwo])
});
```

Besides `next()`, you can terminate your function normally by returning a `NextResponse`:

```javascript
const myMiddleware = (req: NextRequest) => {
  return NextResponse.next(); // Will not process additional middleware and continues execution with Next.js

  return NextResponse.redirect(new URL('/login', req.nextUrl.href)); // // Will not process additional middleware and redirects to the login page

  // Etc...
}
```

## API Reference

### Types

- `MiddlewareFunction: (req: NextRequest, next: () => void) => Promise<NextResponse<unknown>> | NextResponse<unknown>`
- `SetupFunction: (trail: TrailFunction, req: NextRequest) => void`
- `TrailFunction: (routes: string | string[], middleware: MiddlewareFunction | MiddlewareFunction[]) => void`

### Functions

#### `withTrailMiddleware(setup: SetupFunction) => Promise<MiddlewareFunction>`

This function enhances the standard Next.js middleware by allowing for a better organized and customizable middleware stack.

##### Parameters

- **`setup`**: `SetupFunction`

  This is the function that will contain your middleware organization code. It is passed two parameters: `trail` (a function used for creating route middleware) and `request` (a standard Next.js NextRequest).

##### Returns

- **MiddlewareFunction**: A middleware function that can be used to handle requests in Next.js with additional route-specific processing via the `trail` function.

#### `trail(routes: string | string[], middleware: MiddlewareFunction | MiddlewareFunction[]) => void`

This function is passed to `setup` in `withTrailMiddleware`. It's used to assign middleware to your routes.

##### Parameters

- **`routes`**: `string | string[]`

  A route or an array of routes where the supplied middleware will be called. Each route is matched according to the rules of the `match` function from [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp).

  **Matching Examples**

  ```javascript
  trail("/route", myMiddleware); // Matches '/route'. Doesn't match '/route-one'.
  trail("/*allroutes", myMiddleware); // Matches '/route', '/login', '/user/signup', and all other routes.
  trail("/movies/*movie", myMiddleware); // Matches '/movies/10394234', `/movies/action/8345983`. Doesn't match '/movies'.
  ```

- **`middleware`**: `MiddlewareFunction | MiddlewareFunction[]`

  A middleware function or an array of middleware functions to be executed for the specified routes.

##### Returns

- **void**

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
