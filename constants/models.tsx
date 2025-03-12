import anthropic from "@/public/anthropic.svg";
import openai from "@/public/openai.svg";
import { EyeIcon, WholeWordIcon, BrainIcon, ZapIcon } from "lucide-react";
import { LLMModel } from "@/types";

export interface Model {
	id: LLMModel;
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

const modelCards: Model[] = [
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
		id: "claude-3-5-sonnet-latest",
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
		id: "gpt-4o",
		name: "GPT-4o",
		shortDescription: "The latest and greatest GPT model.",
		longDescription:
			"The latest and greatest GPT model. It accepts both text and image inputs. Although images are not yet supported on masters.chat",
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
		id: "claude-3-sonnet-20240229",
		name: "Claude 3 Sonnet",
		shortDescription: "One of the core models from Anthropic.",
		longDescription:
			"One of the core models from Anthropic. It's a good all-rounder, but not as good at code as GPT-4o.",
		icon: "anthropic",
		logo: anthropic,
		features: [
			{
				name: "Reasoning",
				icon: <BrainIcon className="size-4" color="purple" />
			}
		]
	}
];

export default modelCards;
