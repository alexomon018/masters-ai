import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@/constants";
import { makeTestQueryClient } from "../../../../test/utils/renderWithProviders";
import useQuotaInvalidation from "./useQuotaInvalidation";

function setup() {
	const queryClient = makeTestQueryClient();
	const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return { queryClient, invalidateSpy, wrapper };
}

describe("useQuotaInvalidation", () => {
	it("does not invalidate on the initial render (no transition yet)", () => {
		const { invalidateSpy, wrapper } = setup();
		renderHook(() => useQuotaInvalidation(false), { wrapper });
		expect(invalidateSpy).not.toHaveBeenCalled();
	});

	it("invalidates the quota query on idle → streaming", () => {
		const { invalidateSpy, wrapper } = setup();
		const { rerender } = renderHook(
			({ streaming }) => useQuotaInvalidation(streaming),
			{ wrapper, initialProps: { streaming: false } }
		);
		rerender({ streaming: true });
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: queryKeys.messageLimit()
		});
	});

	it("invalidates again on streaming → idle", () => {
		const { invalidateSpy, wrapper } = setup();
		const { rerender } = renderHook(
			({ streaming }) => useQuotaInvalidation(streaming),
			{ wrapper, initialProps: { streaming: true } }
		);
		invalidateSpy.mockClear();
		rerender({ streaming: false });
		expect(invalidateSpy).toHaveBeenCalledTimes(1);
	});

	it("does not invalidate on a re-render with the same value", () => {
		const { invalidateSpy, wrapper } = setup();
		const { rerender } = renderHook(
			({ streaming }) => useQuotaInvalidation(streaming),
			{ wrapper, initialProps: { streaming: true } }
		);
		invalidateSpy.mockClear();
		rerender({ streaming: true });
		expect(invalidateSpy).not.toHaveBeenCalled();
	});
});
