import { Card } from "@atoms";
import { KeyRound, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";

const usageInfo = [
	{
		icon: MessageSquare,
		title: "Included models",
		description:
			"Claude Haiku and GPT-5.4 mini are free to use and count toward your daily message limit."
	},
	{
		icon: KeyRound,
		title: "Frontier models",
		description:
			"Connect your own Anthropic or OpenAI API key to use Opus and GPT-5.4. Usage is billed to your provider account and does not count toward your daily limit.",
		link: { tab: "api-keys" as const, label: "Manage API keys" }
	}
];

const UpgradeSection = () => (
	<section className="space-y-4">
		<h2 className="text-base font-medium">How usage works</h2>
		<div className="grid gap-4 sm:grid-cols-2">
			{usageInfo.map(({ icon: Icon, title, description, link }) => (
				<Card key={title} className="flex flex-col gap-2 p-5">
					<Icon className="size-5 text-primary" />
					<h4 className="text-sm font-medium">{title}</h4>
					<p className="text-xs text-muted-foreground">{description}</p>
					{link && (
						<Link
							to="/settings/$tab"
							params={{ tab: link.tab }}
							className="text-xs font-medium text-primary underline-offset-2 hover:underline"
						>
							{link.label}
						</Link>
					)}
				</Card>
			))}
		</div>
	</section>
);

export default UpgradeSection;
