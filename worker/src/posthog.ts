// Lightweight PostHog capture helper for the Cloudflare Worker.
// Uses the HTTP Capture API directly (no posthog-node) so it works in the
// Workers edge runtime without any Node.js dependencies.

const CAPTURE_ENDPOINT = "https://eu.i.posthog.com/i/v0/e/";

export interface AiGenerationProperties {
	$ai_trace_id: string;
	$ai_session_id?: string;
	$ai_model: string;
	$ai_provider: string;
	$ai_input_tokens?: number;
	$ai_output_tokens?: number;
	$ai_latency?: number;
	$ai_stream?: boolean;
	$ai_stop_reason?: string;
	$ai_is_error?: boolean;
	$ai_error?: string;
}

interface CapturePayload {
	api_key: string;
	event: string;
	distinct_id: string;
	properties: Record<string, unknown>;
}

export function captureAiGeneration(
	apiKey: string,
	distinctId: string,
	properties: AiGenerationProperties
): Promise<void> {
	const payload: CapturePayload = {
		api_key: apiKey,
		event: "$ai_generation",
		distinct_id: distinctId,
		properties: properties as unknown as Record<string, unknown>
	};

	return fetch(CAPTURE_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload)
	})
		.then(() => undefined)
		.catch((err) => {
			console.error("[posthog] capture failed:", err);
		});
}

export function providerFromModel(modelId: string): string {
	if (modelId.startsWith("claude")) return "anthropic";
	if (
		modelId.startsWith("gpt") ||
		modelId.startsWith("o1") ||
		modelId.startsWith("o3") ||
		modelId.startsWith("o4")
	)
		return "openai";
	return "unknown";
}
