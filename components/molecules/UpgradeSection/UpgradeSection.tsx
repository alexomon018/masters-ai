import { Button } from "@atoms";
import { Sparkles, Rocket, Zap } from "lucide-react";

const UpgradeSection = () => (
	<section className="space-y-8">
		<div className="flex items-center justify-between">
			<h2 className="text-3xl font-semibold tracking-tight">Upgrade to Pro</h2>
			<div className="text-right">
				<span className="text-4xl font-bold tracking-tight">$7</span>
				<span className="text-lg text-muted-foreground">/month</span>
			</div>
		</div>

		<div className="grid gap-8 md:grid-cols-3">
			<div className="flex flex-col gap-2">
				<Sparkles className="size-6 text-primary" />
				<h3 className="text-lg font-semibold">Generous Message Limits</h3>
				<p className="text-muted-foreground">
					Send over 1,400 messages per month*
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<Rocket className="size-6 text-primary" />
				<h3 className="text-lg font-semibold">All AI Models</h3>
				<p className="text-muted-foreground">
					Get access to our full suite of models including Claude 3.5 Sonnet,
					gpt-4o, and more!
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<Zap className="size-6 text-primary" />
				<h3 className="text-lg font-semibold">Priority Support</h3>
				<p className="text-muted-foreground">
					Get faster responses and dedicated assistance
				</p>
			</div>
		</div>

		<Button className="rounded-xl bg-primary font-medium">Coming Soon</Button>

		<p className="text-sm text-muted-foreground">
			*Claude usage is limited to 100 messages per month. Premium credits can be
			purchased separately.
		</p>
	</section>
);

export default UpgradeSection;
