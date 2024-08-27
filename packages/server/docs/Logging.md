# Logging

## Winston

The project uses `winston` as the logger and `morgan`. The default log level is `info`. To change the log level, set the `LOG_LEVEL` environment variable to one of the following values:

1. `error`
2. `warn`
3. `info`
4. `http`
5. `verbose`
6. `debug`
7. `silly`

### Morgan

`morgan` is the middleware used to log HTTP requests with `winston`. To change the log format, set the `HTTP_LOG_FORMAT` environment variable to one of the following values:

1. `combined`
2. `common`
3. `dev`
4. `short`
5. `tiny`

For more information, see the [morgan middleware documentation](https://expressjs.com/en/resources/middleware/morgan.html)

## What is Logged at Each Level

### `error`

- **Description**: Logs error conditions.
- **Details Logged**:
  - Error messages and stack traces.
  - Request body (only when an error occurs).

### `warn`

- **Description**: Logs potentially harmful situations.
- **Details Logged**:
  - Warning messages indicating potential issues.

### `info`

- **Description**: Logs informational messages that highlight the progress of the application.
- **Details Logged**:
  - High-level operations and events.

### `http`

- **Description**: Logs HTTP request details.
- **Details Logged**:
  - Request method, URL, status, and response time.
  - General request information without the body.

### `verbose`

- **Description**: Logs detailed informational events.
- **Details Logged**:
  - Detailed application events that are more verbose than `info`.

### `debug`

- **Description**: Logs detailed debug information, mainly used in development.
- **Details Logged**:
  - Request bodies.
  - Detailed debugging information.

### `silly`

- **Description**: Logs the most detailed information, often excessive.
- **Details Logged**:
  - Highly detailed information, more verbose than `debug`.
