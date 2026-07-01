// Shared types for the per-user long-term memory layer. Confidence is carried
// on the public API as a 0..1 float (matching common embedding/extraction
// conventions); the D1 column stores it as an integer 0..100 — see the repo
// for the conversion.

export type MemoryType = "preference" | "fact" | "episode";

export type MemorySource = "user_stated" | "inferred" | "admin_set";

export type MemoryStatus = "active" | "provisional" | "revoked" | "superseded";

// A raw observation proposed for durable storage. Status is intentionally
// absent: the promotion gate computes it from type + source + confidence so a
// caller can never inject an "active" record from an untrusted path.
export interface MemoryCandidate {
	type: MemoryType;
	key?: string | null;
	content: string;
	source?: MemorySource;
	confidence?: number;
	sourceThreadId?: string | null;
}
