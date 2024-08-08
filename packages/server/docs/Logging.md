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

