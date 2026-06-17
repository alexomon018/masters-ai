import { Button, Card } from "@atoms";
import { Sparkles, Rocket, Zap } from "lucide-react";

const benefits = [
	{
		icon: Sparkles,
		title: "Generous Message Limits",
		description: "Send over 1,400 messages per month*"
	},
	{
		icon: Rocket,
		title: "All AI Models",
		description:
			"Get access to our full suite of models from Anthropic and OpenAI, and more!"
	},
	{
		icon: Zap,
		title: "Priority Support",
		description: "Get faster responses and dedicated assistance"
	}
];

const UpgradeSection = () => (
	<section className="space-y-4">
		<h3 className="text-base font-medium">Upgrade to Pro</h3>

		<div className="grid gap-4 sm:grid-cols-3">
			{benefits.map(({ icon: Icon, title, description }) => (
				<Card key={title} className="flex flex-col gap-2 p-5">
					<Icon className="size-5 text-primary" />
					<h4 className="text-sm font-medium">{title}</h4>
					<p className="text-xs text-muted-foreground">{description}</p>
				</Card>
			))}
		</div>

		<Button>Coming Soon</Button>

		<p className="text-xs text-muted-foreground">
			*Claude usage is limited to 100 messages per month. Premium credits can be
			purchased separately.
		</p>
	</section>
);

export default UpgradeSection;
