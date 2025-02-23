import { Button, Switch } from "@atoms";
import { RefreshCw } from "lucide-react";

const CloudSyncSection = () => (
	<section>
		<h2 className="mb-2 text-xl font-semibold sm:text-2xl">Cloud Sync</h2>
		<p className="mb-4 text-sm text-muted-foreground sm:text-base">
			Enable and disable Cloud Sync. Threads will be synced whenever new
			messages are sent*
		</p>
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center space-x-4">
				<Switch id="cloud-sync" aria-label="Enable Cloud Sync" />
				<p className="text-sm sm:text-base">Enable Cloud Sync</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				className="flex items-center justify-center gap-2 sm:justify-start"
			>
				<RefreshCw className="size-4" />
				<span className="text-sm sm:text-base">Sync Now</span>
			</Button>
		</div>
	</section>
);

export default CloudSyncSection;
