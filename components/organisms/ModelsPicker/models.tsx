import anthropic from "@/public/anthropic.svg";
import grok from "@/public/grok.svg";
import openai from "@/public/openai.svg";
import { EyeIcon, WholeWordIcon, BrainIcon, ZapIcon } from "lucide-react";

interface Model {
	id: string;
	name: string;
	shortDescription: string;
	longDescription: string;
	icon: string;
	logo: string;
	features: Array<{
		name: string;
		icon: React.ReactNode;
	}>;
	isDefault?: boolean;
}

const models: Model[] = [
	{
		id: "gpt-4o-mini",
		name: "GPT-4o-mini",
		shortDescription: "Like gpt-4o, but faster.",
		longDescription:
			"Like gpt-4o, but faster. This model sacrifices some of the original GPT-4o's precision for significantly reduced latency. It accepts both text and image inputs.",
		icon: "openai",
		logo: openai,
		features: [
			{
				name: "Vision",
				icon: <EyeIcon className="size-4" color="blue" />
			},
			{
				name: "Fast",
				icon: <ZapIcon className="size-4" color="#FF9800" />
			}
		]
	},
	{
		id: "claude-3.5-sonnet",
		name: "Claude 3.5 Sonnet",
		shortDescription: "Smart model for complex problems.",
		longDescription:
			"Smart model for complex problems. Known for being good at code and math. Also kind of slow and expensive.",
		icon: "anthropic",
		logo: anthropic,
		features: [
			{
				name: "Reasoning",
				icon: <BrainIcon className="size-4" color="purple" />
			},
			{
				name: "Web Search",
				icon: <WholeWordIcon className="size-4" color="green" />
			}
		]
	},
	{
		id: "grok-3",
		name: "Grok 3",
		shortDescription: "High-performance language model.",
		longDescription:
			"High-performance language model. Grok's latest model features extended context window and improved reasoning capabilities for complex tasks.",
		icon: "grok",
		logo: grok,
		features: [
			{
				name: "Vision",
				icon: <EyeIcon className="size-4" color="blue" />
			},
			{
				name: "Thinking",
				icon: <BrainIcon className="size-4" color="purple" />
			}
		]
	}
];

export default models;
