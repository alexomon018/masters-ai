// The promotion gate: the single decision point for what is allowed to enter
// durable memory. Pure and synchronous apart from the content hash (Web Crypto
// digest), so its rules are exhaustively unit-testable without a database.
//
// The gate enforces the article's discipline: promote everything and the store
// poisons itself; promote nothing and the agent feels amnesiac. It classifies
// and normalizes a candidate, rejects what fails type-specific verification,
// and computes a status the caller is never trusted to set.

import type {
	MemoryCandidate,
	MemorySource,
	MemoryStatus,
	MemoryType
} from "./types";

// Type-specific confidence floors. Facts demand a higher bar than preferences
// because a wrong fact silently poisons future answers, while a wrong
// preference only makes the assistant feel slightly off.
export const PREFERENCE_MIN_CONFIDENCE = 0.5;
export const FACT_MIN_CONFIDENCE = 0.7;
export const EPISODE_MIN_CONFIDENCE = 0.5;

// An inferred fact below this stays "provisional" — stored, deduped, and
// confirmable on a second observation, but withheld from prompt injection so a
// single shaky inference never reaches the model as established truth.
export const FACT_ACTIVE_CONFIDENCE = 0.8;

export const MAX_CONTENT_LENGTH = 500;
export const MAX_KEY_LENGTH = 64;

// Default confidence for an inferred candidate that arrives without an explicit
// score. Kept below every type floor so unscored inferred memory is rejected
// rather than silently treated as certain — promotion requires a real score.
export const UNSCORED_INFERRED_CONFIDENCE = 0.4;

export interface AcceptedCandidate {
	outcome: "accepted";
	type: MemoryType;
	key: string | null;
	content: string;
	contentHash: string;
	source: MemorySource;
	confidence: number;
	status: Extract<MemoryStatus, "active" | "provisional">;
	sourceThreadId: string | null;
}

export interface RejectedCandidate {
	outcome: "rejected";
	reason: string;
}

export type GateResult = AcceptedCandidate | RejectedCandidate;

// Collapse whitespace and trim — the storage form a human reads. Hashing
// lowercases on top of this so "Uses TypeScript" and "uses typescript" dedup.
function normalizeContent(raw: string): string {
	return raw.replace(/\s+/g, " ").trim();
}

function normalizeKey(raw: string | null | undefined): string | null {
	if (raw == null) return null;
	// Trim BEFORE collapsing whitespace so leading/trailing spaces don't become
	// stray underscores (" response format " -> "response_format", not
	// "_response_format_") — otherwise the same logical key fails to match an
	// existing preference row during supersession.
	const cleaned = raw.trim().replace(/\s+/g, "_").toLowerCase();
	return cleaned.length > 0 ? cleaned : null;
}

// SHA-256 of (type|key|content), the dedup primitive. Scoped by user_id at the
// storage layer, never here — the gate is scope-agnostic so the same hash means
// "same assertion" regardless of who it belongs to.
export async function computeContentHash(
	type: MemoryType,
	key: string | null,
	normalizedContent: string
): Promise<string> {
	const material = `${type}|${key ?? ""}|${normalizedContent.toLowerCase()}`;
	const bytes = new TextEncoder().encode(material);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function minConfidenceFor(type: MemoryType): number {
	if (type === "fact") return FACT_MIN_CONFIDENCE;
	if (type === "episode") return EPISODE_MIN_CONFIDENCE;
	return PREFERENCE_MIN_CONFIDENCE;
}

// Status is derived, never supplied. user_stated signals (an explicit "I want
// JSON") enter active immediately; low-confidence inferred facts wait in
// provisional until a second observation confirms them.
function computeStatus(
	type: MemoryType,
	source: MemorySource,
	confidence: number
): Extract<MemoryStatus, "active" | "provisional"> {
	if (source === "user_stated" || source === "admin_set") return "active";
	if (type === "fact" && confidence < FACT_ACTIVE_CONFIDENCE) {
		return "provisional";
	}
	return "active";
}

export async function evaluateCandidate(
	candidate: MemoryCandidate
): Promise<GateResult> {
	const content = normalizeContent(candidate.content ?? "");
	if (content.length === 0) {
		return { outcome: "rejected", reason: "empty content" };
	}
	if (content.length > MAX_CONTENT_LENGTH) {
		return { outcome: "rejected", reason: "content too long" };
	}

	const source: MemorySource = candidate.source ?? "inferred";
	// A missing score is only "certain" for an explicit human signal. An
	// inferred candidate with no score must not coast through the gate as 1.0;
	// fall back to a sub-threshold default so it needs a real score to promote.
	const confidence =
		typeof candidate.confidence === "number"
			? Math.max(0, Math.min(1, candidate.confidence))
			: source === "inferred"
				? UNSCORED_INFERRED_CONFIDENCE
				: 1;

	if (confidence < minConfidenceFor(candidate.type)) {
		return { outcome: "rejected", reason: "confidence below threshold" };
	}

	let key = normalizeKey(candidate.key);
	if (candidate.type === "preference") {
		if (!key) {
			return { outcome: "rejected", reason: "preference requires a key" };
		}
		if (key.length > MAX_KEY_LENGTH) {
			return { outcome: "rejected", reason: "preference key too long" };
		}
	} else {
		// Keys are only meaningful for preferences; drop any the extractor
		// attached to a fact/episode so dedup hashing stays consistent.
		key = null;
	}

	const sourceThreadId = candidate.sourceThreadId ?? null;
	if (
		(candidate.type === "fact" || candidate.type === "episode") &&
		source === "inferred" &&
		!sourceThreadId
	) {
		// Provenance is mandatory for inferred durable knowledge: without the
		// originating thread there is no replay path and no audit trail.
		return { outcome: "rejected", reason: "missing provenance" };
	}

	const contentHash = await computeContentHash(candidate.type, key, content);

	return {
		outcome: "accepted",
		type: candidate.type,
		key,
		content,
		contentHash,
		source,
		confidence,
		status: computeStatus(candidate.type, source, confidence),
		sourceThreadId
	};
}
