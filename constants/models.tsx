import { ZapIcon } from "lucide-react";
import { LLMModel } from "@/types";
import type Icons from "@/assets/icons";

// `icon` names a key in `assets/icons` (rendered via <CustomIcon>) — it's
// a string, not a ReactNode. `features[].icon` is a real ReactNode (the
// lucide JSX) inlined below. The two fields look the same but render
// through different paths; the types make that explicit.
export type ModelIconKey = keyof typeof Icons;

export interface Model {
	id: LLMModel;
	name: string;
	shortDescription: string;
	longDescription: string;
	icon: ModelIconKey;
	features: Array<{
		name: string;
		icon: React.ReactNode;
	}>;
	isDefault?: boolean;
}

const modelCards: Model[] = [
	{
		id: "claude-haiku-4-5",
		name: "Claude Haiku 4.5",
		shortDescription: "The fastest model with near-frontier intelligence.",
		longDescription:
			"Anthropic's fastest model with near-frontier intelligence. Great default for everyday questions — quick, cheap, and still capable enough for most coding and reasoning tasks.",
		icon: "anthropic",
		features: [
			{
				name: "Fast",
				icon: <ZapIcon className="size-4" color="#FF9800" />
			}
		],
		isDefault: true
	},
	{
		id: "gpt-5.4-mini",
		name: "GPT-5.4 mini",
		shortDescription: "OpenAI's strongest mini model — fast and cheap.",
		longDescription:
			"OpenAI's strongest mini model. Pick this when latency matters more than peak quality.",
		icon: "openai",
		features: [
			{
				name: "Fast",
				icon: <ZapIcon className="size-4" color="#FF9800" />
			}
		]
	}
];

export default modelCards;
