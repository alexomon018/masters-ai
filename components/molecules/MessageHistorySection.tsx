import { Button } from "@atoms";

export function MessageHistorySection() {
	return (
		<section>
			<h2 className="mb-2 text-xl font-semibold sm:text-2xl">
				Message History
			</h2>
			<p className="mb-4 text-sm text-muted-foreground sm:text-base">
				Save your history as JSON, or import someone else's. Importing will NOT
				delete existing messages
			</p>
			<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
				<Button variant="outline" className="text-sm sm:text-base">
					Import
				</Button>
				<Button variant="outline" className="text-sm sm:text-base">
					Export
				</Button>
			</div>
		</section>
	);
}
