import { assert, describe, expect, it } from 'vitest';
import {
	telemetryChannel,
	type TracedFunctionDetails,
	type TracingChannelEvent,
} from './index';
import type { TracingChannelSubscribers } from 'node:diagnostics_channel';
import type { MarkRequired } from 'ts-essentials';

describe('TelemetryChannel', () => {
	describe('traceSync', () => {
		it('runs a synchronous telemetry event', () => {
			const channel = telemetryChannel<{ id: number }>('my-channel');
			const [contextCaptures, subscribers] = setupContextCapture<{
				id: number;
			}>();
			channel.subscribe(subscribers);
			const foo = channel.traceSync(
				(name) => `Hello ${name}`,
				{ id: 1 },
				null,
				'Jake',
			);
			expect(foo).toBe('Hello Jake');

			const { start } = contextCaptures;
			assert(start);
			expect(start).toEqual({
				id: 1,
				startMonotonicTime: expect.any(BigInt),
			});

			const end = assertAllTelemetryFields(contextCaptures.end);
			expect(end).toEqual({
				id: 1,
				startMonotonicTime: start.startMonotonicTime,
				endMonotonicTime: expect.any(BigInt),
				duration: expect.any(BigInt),
				result: 'Hello Jake',
			});
			expect(end.endMonotonicTime).toBeGreaterThan(end.startMonotonicTime);
			expect(end.duration).toBe(end.endMonotonicTime - end.startMonotonicTime);

			expect(contextCaptures.error).toBeUndefined();
			expect(contextCaptures.asyncStart).toBeUndefined();
			expect(contextCaptures.asyncEnd).toBeUndefined();
		});

		it('still tracks duration if the function throws', () => {
			const channel = telemetryChannel('my-channel');
			const [contextCaptures, subscribers] = setupContextCapture();
			channel.subscribe(subscribers);
			expect(() => {
				channel.traceSync(
					(_name) => {
						throw new Error('supposed to happen');
					},
					{},
					null,
					'Jake',
				);
			}).toThrowError('supposed to happen');
			const { start } = contextCaptures;
			expect(start).toEqual({
				startMonotonicTime: expect.any(BigInt),
			});
			assert(start);

			const error = assertAllTelemetryFields(contextCaptures.error);
			expect(error).toEqual({
				startMonotonicTime: start.startMonotonicTime,
				endMonotonicTime: expect.any(BigInt),
				duration: expect.any(BigInt),
				error: expect.any(Error),
				result: undefined,
			});
			expect(error.endMonotonicTime).toBeGreaterThan(error.startMonotonicTime);
			expect(error.duration).toBe(
				error.endMonotonicTime - error.startMonotonicTime,
			);
			const err = contextCaptures.error?.error as Error;
			expect(err.message).toEqual('supposed to happen');

			const end = assertAllTelemetryFields(contextCaptures.end);
			expect(end).toEqual({
				startMonotonicTime: start.startMonotonicTime,
				endMonotonicTime: error.endMonotonicTime,
				duration: error.duration,
				error: contextCaptures.error?.error,
			});

			expect(contextCaptures.asyncStart).toBeUndefined();
			expect(contextCaptures.asyncEnd).toBeUndefined();
		});

		it('runs a telemetry event with a new this binding', () => {
			const channel = telemetryChannel('my-channel');
			const [contextCaptures, subscribers] = setupContextCapture();
			channel.subscribe(subscribers);
			const ths: { first?: number | undefined } = {};
			function doubleFirstAddAfter(
				this: { first?: number | undefined },
				num: number,
			) {
				if (!this.first) this.first = num;
				return this.first + num;
			}
			const four = doubleFirstAddAfter.apply(ths, [2]);
			expect(four).toBe(4);
			expect(ths).toEqual({ first: 2 });
			const three = channel.traceSync(doubleFirstAddAfter, {}, ths, 1);
			expect(three).toBe(3);

			const { start } = contextCaptures;
			assert(start);
			expect(start).toEqual({
				startMonotonicTime: expect.any(BigInt),
			});

			const end = assertAllTelemetryFields(contextCaptures.end);
			expect(end).toEqual({
				startMonotonicTime: start.startMonotonicTime,
				endMonotonicTime: expect.any(BigInt),
				duration: expect.any(BigInt),
				result: 3,
			});
			expect(end.endMonotonicTime).toBeGreaterThan(end.startMonotonicTime);
			expect(end.duration).toBe(end.endMonotonicTime - end.startMonotonicTime);

			expect(contextCaptures.error).toBeUndefined();
			expect(contextCaptures.asyncStart).toBeUndefined();
			expect(contextCaptures.asyncEnd).toBeUndefined();
		});
	});

	describe('tracePromise', () => {
		it.todo('runs a promise telemetry event');
		it.todo('still tracks duration if the promise rejects');
		it.todo('runs a telemetry event with a new this binding');
	});

	describe('traceCallback', () => {
		it.todo('runs a callback telemetry event');
		it.todo('still tracks duration if the callback throws');
		it.todo('runs a telemetry event with a new this binding');
	});
});

type TracingChannelContextCaptures<
	R extends Record<string, any>,
	T extends TracingChannelEvent<R>,
> = {
	start: T | undefined;
	end: T | undefined;
	error: T | undefined;
	asyncStart: T | undefined;
	asyncEnd: T | undefined;
};
const setupContextCapture = <
	C extends Record<string, any>,
	T extends TracingChannelEvent<C> = TracingChannelEvent<C>,
>(): [TracingChannelContextCaptures<C, T>, TracingChannelSubscribers<T>] => {
	const contextCaptures: TracingChannelContextCaptures<C, T> = {
		start: undefined,
		end: undefined,
		error: undefined,
		asyncStart: undefined,
		asyncEnd: undefined,
	};
	const subscribers: TracingChannelSubscribers<T> = {
		start(ctx) {
			contextCaptures.start = structuredClone(ctx);
		},
		end(ctx) {
			contextCaptures.end = structuredClone(ctx);
		},
		error(ctx) {
			contextCaptures.error = structuredClone(ctx);
		},
		asyncStart(ctx) {
			contextCaptures.asyncStart = structuredClone(ctx);
		},
		asyncEnd(ctx) {
			contextCaptures.asyncEnd = structuredClone(ctx);
		},
	};
	return [contextCaptures, subscribers];
};

const assertAllTelemetryFields = <
	C extends Record<string, any>,
	T extends TracingChannelEvent<C>,
	R = unknown,
>(
	ctx: T | undefined,
): MarkRequired<
	T,
	keyof Omit<TracedFunctionDetails<R>, 'result' | 'error'>
> => {
	assert(ctx);
	assert(ctx.startMonotonicTime);
	assert(ctx.endMonotonicTime);
	assert(ctx.duration);
	return ctx as MarkRequired<T, keyof TracedFunctionDetails<R>>;
};
