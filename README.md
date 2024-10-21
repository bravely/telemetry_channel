telemetry_channel
====

A helper library standardizing `diagnostic_channel` channels for emitting telemetry events, inspired by Erlang/Elixir's [Telemetry](https://hexdocs.pm/telemetry) library.

## Installation

This package requires Node.js `19.9.0` or later, or `^18.19.0`, as that's
when [TracingChannel](https://nodejs.org/api/diagnostics_channel.html#class-tracingchannel) was introduced.

**NPM**
```bash
npm install telemetry_channel
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

