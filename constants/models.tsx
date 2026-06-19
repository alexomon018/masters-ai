import { ZapIcon, BrainIcon } from "lucide-react";
import { LLMModel } from "@/types";
import type Icons from "@/assets/icons";

export type LLMProvider = "anthropic" | "openai";

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
	provider: LLMProvider;
	features: Array<{
		name: string;
		icon: React.ReactNode;
	}>;
	isDefault?: boolean;
	byok?: boolean;
}

const modelCards: Model[] = [
	{
		id: "gpt-5.4-mini",
		name: "GPT-5.4 mini",
		shortDescription: "OpenAI's strongest mini model — fast and cheap.",
		longDescription:
			"OpenAI's strongest mini model. Pick this when latency matters more than peak quality.",
		icon: "openai",
		provider: "openai",
		features: [
			{
				name: "Fast",
				icon: <ZapIcon className="size-4" color="#FF9800" />
			}
		],
		isDefault: true
	},
	{
		id: "claude-haiku-4-5",
		name: "Claude Haiku 4.5",
		shortDescription: "The fastest model with near-frontier intelligence.",
		longDescription:
			"Anthropic's fastest model with near-frontier intelligence. Great default for everyday questions — quick, cheap, and still capable enough for most coding and reasoning tasks.",
		icon: "anthropic",
		provider: "anthropic",
		features: [
			{
				name: "Fast",
				icon: <ZapIcon className="size-4" color="#FF9800" />
			}
		]
	},
	{
		id: "claude-opus-4-8",
		name: "Claude Opus 4.8",
		shortDescription:
			"Anthropic's most capable frontier model. Requires your API key.",
		longDescription:
			"Anthropic's frontier model for the hardest reasoning and coding tasks. Connect your own Anthropic API key to unlock it — usage is billed directly to your account.",
		icon: "anthropic",
		provider: "anthropic",
		byok: true,
		features: [
			{
				name: "Reasoning",
				icon: <BrainIcon className="size-4" color="purple" />
			}
		]
	},
	{
		id: "gpt-5.4",
		name: "GPT-5.4",
		shortDescription:
			"OpenAI's flagship frontier model. Requires your API key.",
		longDescription:
			"OpenAI's flagship model for peak quality. Connect your own OpenAI API key to unlock it — usage is billed directly to your account.",
		icon: "openai",
		provider: "openai",
		byok: true,
		features: [
			{
				name: "Reasoning",
				icon: <BrainIcon className="size-4" color="purple" />
			}
		]
	}
];

export default modelCards;
