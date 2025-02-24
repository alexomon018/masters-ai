import { cn } from "@/utils";
import { Button } from "@atoms";

type DangerZoneSectionProps = {
	className?: string;
	title?: string;
	description?: string;
};

const DangerZoneSection = ({
	className,
	title = "Danger Zone",
	description = "Permanently delete your account and all associated data."
}: DangerZoneSectionProps) => (
	<section className={cn(className)}>
		<h2 className="mb-2 text-2xl font-semibold text-destructive">{title}</h2>
		<p className="mb-4 text-muted-foreground">{description}</p>
		<Button variant="destructive" className="w-full sm:w-auto">
			Delete Account
		</Button>
	</section>
);

export default DangerZoneSection;
