telemetry_channel
====

A helper library standardizing `diagnostic_channel` channels for emitting telemetry events, inspired by Erlang/Elixir's [Telemetry](https://hexdocs.pm/telemetry) library.

## Installation

This package requires Node.js `19.9.0` or later, or `^18.19.0`, as that's
when [TracingChannel](https://nodejs.org/api/diagnostics_channel.html#class-tracingchannel) was introduced.

```bash
npm install telemetry_channel

pnpm add telemetry_channel

yarn add telemetry_channel

bun add telemetry_channel
```

## Usage

```typescript
import diagnostics_channel from 'diagnostics_channel'
import { telemetryChannel, type TelemetryEvents } from 'telemetry_channel'

const eventChannel = telemetryChannel('user.newUser')

const logTelemetry = (message: TelemetryEvents['end']) => {
	if (message.error) {
		logger.error('New user creation failed', { error: message.error })
		return
	}
	logger.info('New user created', { duration: message.duration / 1_000_000 })
}

// Just uses `diagnostic_channel`.tracingChannel under the hood
diagnosticChannel.subscribe('tracing:user.newUser:end', logTelemetry)

const newUser = (attrs: UserAttributes) => {
	...
}
// Uses the same APIs as `diagnostic_channel`
const newUser = eventChannel.traceSync((attrs: UserAttributes) => {
	...
}, { referrer: 'google' }, null, request.parsedBody)
```

### Traced Function Details
Under the hood, this is just a wrapper around `diagnostics_channel`'s [`TracingChannel`](https://nodejs.org/docs/latest-v18.x/api/diagnostics_channel.html#class-tracingchannel)
that provides monotonic timing data to the event context. These are the fields
and what they correspond to:

- `result`: Provided by `TracingChannel`, the result of the function if it succeeds. Not available in the `start` or `error` events.
- `error`: Provided by `TracingChannel`, the error that occurred if the function fails. Not available in the `start` event.
- `startMonotonicTime`: The result of [`process.hrtime.bigint()`](https://nodejs.org/api/process.html#processhrtimebigint) at the start of the function.
- `endMonotonicTime`: The result of [`process.hrtime.bigint()`](https://nodejs.org/api/process.html#processhrtimebigint) at the end of the function.
- `duration`: The difference between `endMonotonicTime` and `startMonotonicTime`.

## Todo
- [x] Add `traceSync`
- [ ] Add `tracePromise`
- [ ] Add `traceCallback`
- [ ] Publish to npm
