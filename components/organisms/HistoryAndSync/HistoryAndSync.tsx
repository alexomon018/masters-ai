import { Separator } from "@atoms";
import {
	CloudSyncSection,
	MessageHistorySection,
	DangerZoneSection
} from "@molecules";
import React from "react";

const HistoryAndSync = () => (
	<div className="mt-8 space-y-8">
		<CloudSyncSection />
		<Separator className="my-8" />
		<MessageHistorySection />
		<Separator className="my-8" />
		<DangerZoneSection />

		<p className="mt-10 text-xs text-muted-foreground sm:text-sm">
			*The retention policies of our LLM hosting partners may vary.
		</p>
	</div>
);

export default HistoryAndSync;
