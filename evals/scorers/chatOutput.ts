import type { ParsedRagHit } from "../helpers/parseRagToolResult";

export interface ChatAgentOutput {
	text: string;
	toolNames: string[];
	casual: boolean;
	/** Chunk text returned by ragSearch (what the model saw). */
	ragHitTexts: string[];
	/** Course/instructor metadata from ragSearch hits. */
	ragHits: ParsedRagHit[];
}
