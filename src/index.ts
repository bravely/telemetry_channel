import type { Merge } from 'ts-essentials';
import {
	tracingChannel,
	type TracingChannelSubscribers,
	type TracingChannel,
} from 'node:diagnostics_channel';

export function telemetryChannel<
	StoreType extends Record<string, any> = Record<string, any>,
	ContextType extends Record<string, any> = StoreType,
>(name: string): TelemetryChannel<StoreType, ContextType> {
	return new TelemetryChannel(name);
}

export type TracedFunctionDetails<R> = {
	startMonotonicTime: bigint;
	endMonotonicTime?: bigint | undefined;
	duration?: bigint | undefined;
	result?: R | undefined;
	error?: R | undefined;
};
export type TracingChannelEvent<
	C extends Record<string, any>,
	R = unknown,
> = Merge<C, TracedFunctionDetails<R>>;

/**
 * The class `TelemetryChannel` is a collection of `TracingChannel Channels` which
 * together express a single traceable action, preloaded with basic telemetry
 * data. It is used to formalize and simplify the process of producing events
 * for tracing application flow. {@link tracingChannel} is used to construct a
 * `TelemetryChannel`. As with `diagnostics_channel`'s `Channel` it is
 * recommended to create and reuse a single `TelemetryChannel` at the top-level
 * of the file rather than creating them dynamically.
 */
class TelemetryChannel<
	StoreType extends Record<string, any> = Record<string, any>,
	ContextType extends Record<string, any> = StoreType,
> {
	/**
	 * The actual `TracingChannel` instance that this `TelemetryChannel` wraps.
	 */
	public tracedChannel: TracingChannel<
		StoreType,
		TracingChannelEvent<ContextType>
	>;
	constructor(public name: string) {
		this.tracedChannel = tracingChannel(name);
	}

	/**
	 * Helper to subscribe a collection of functions to the corresponding channels.
	 * This is the same as calling `channel.subscribe(onMessage)` on each channel
	 * individually.
	 *
	 * ```ts
	 * import { telemetryChannel } from 'telemetry_channel';
	 *
	 * const channels = telemetryChannel('my-channel');
	 *
	 * channels.subscribe({
	 *   start(message) {
	 *     // Handle start message
	 *   },
	 *   end(message) {
	 *     // Handle end message
	 *   },
	 *   asyncStart(message) {
	 *     // Handle asyncStart message
	 *   },
	 *   asyncEnd(message) {
	 *     // Handle asyncEnd message
	 *   },
	 *   error(message) {
	 *     // Handle error message
	 *   },
	 * });
	 * ```
	 * @param subscribers Set of `TracingChannel Channels` subscribers
	 */
	subscribe(
		subscribers: TracingChannelSubscribers<TracingChannelEvent<ContextType>>,
	): void {
		this.tracedChannel.subscribe(subscribers);
	}

	/**
	 * Helper to unsubscribe a collection of functions from the corresponding channels.
	 * This is the same as calling `channel.unsubscribe(onMessage)` on each channel
	 * individually.
	 *
	 * ```js
	 * import { telemetryChannel } from 'telemetry_channel';
	 *
	 * const channels = telemetryChannel('my-channel');
	 *
	 * channels.unsubscribe({
	 *   start(message) {
	 *     // Handle start message
	 *   },
	 *   end(message) {
	 *     // Handle end message
	 *   },
	 *   asyncStart(message) {
	 *     // Handle asyncStart message
	 *   },
	 *   asyncEnd(message) {
	 *     // Handle asyncEnd message
	 *   },
	 *   error(message) {
	 *     // Handle error message
	 *   },
	 * });
	 * ```
	 * @param subscribers Set of `TracingChannel Channels` subscribers
	 * @return `true` if all handlers were successfully unsubscribed, and `false` otherwise.
	 */
	unsubscribe(
		subscribers: TracingChannelSubscribers<TracingChannelEvent<ContextType>>,
	): boolean {
		// In reality, tracingChannel.unsubscribe returns a boolean, but TypeScript's
		// types don't allow for that.
		return this.tracedChannel.unsubscribe(subscribers) as unknown as boolean;
	}

	traceSync<ThisArg, Args extends unknown[], Return>(
		fn: (this: ThisArg, ...args: Args) => Return,
		context?: ContextType,
		thisArg?: ThisArg | undefined,
		...args: Args
	): Return {
		// @ts-expect-error: This is a hack to get around TypeScript's particulars when it comes to fully unknown objects
		const newContext: Merge<ContextType, TracingChannelEvent> = Object.assign(
			context ?? {},
			{
				startMonotonicTime: process.hrtime.bigint(),
			},
		);
		function trackedFn(this: ThisArg, ...args: Args) {
			try {
				return fn.apply(thisArg as ThisArg, args);
			} finally {
				newContext.endMonotonicTime = process.hrtime.bigint();
				newContext.duration =
					newContext.endMonotonicTime - newContext.startMonotonicTime;
			}
		}
		return this.tracedChannel.traceSync(
			trackedFn,
			newContext,
			thisArg,
			...args,
		) as Return;
	}
}
