import { Button } from "@atoms";

const DangerZoneSection = () => (
	<section>
		<h2 className="mb-2 text-xl font-semibold text-destructive sm:text-2xl">
			Danger Zone
		</h2>
		<p className="mb-4 text-sm text-muted-foreground sm:text-base">
			Permanently delete your history from both your local device and our
			servers.*
		</p>
		<Button
			variant="destructive"
			className="w-full text-sm sm:w-auto sm:text-base"
		>
			Delete Chat History
		</Button>
	</section>
);

export default DangerZoneSection;
