"use client";

import {
	Button,
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@atoms";
import useMessageHistory from "./useMessageHistory";

const MessageHistorySection = () => {
	const {
		exportToJson,
		importFromJson,
		isExporting,
		isImporting,
		alertOpen,
		setAlertOpen,
		alertTitle,
		alertDescription,
		alertType
	} = useMessageHistory();

	return (
		<section>
			<h2 className="mb-2 text-xl font-semibold sm:text-2xl">
				Message History
			</h2>
			<p className="mb-4 text-sm text-muted-foreground sm:text-base">
				{`Save your history as JSON, or import someone else's. Importing will
				NOT delete existing messages`}
			</p>

			<div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
				<Button
					variant="outline"
					className="text-sm sm:text-base"
					onClick={importFromJson}
					disabled={isImporting || isExporting}
				>
					{isImporting ? "Importing..." : "Import"}
				</Button>
				<Button
					variant="outline"
					className="text-sm sm:text-base"
					onClick={exportToJson}
					disabled={isImporting || isExporting}
				>
					{isExporting ? "Exporting..." : "Export"}
				</Button>
			</div>

			<AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle
							className={
								alertType === "error" ? "text-red-600" : "text-green-600"
							}
						>
							{alertTitle}
						</AlertDialogTitle>
						<AlertDialogDescription>{alertDescription}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button onClick={() => setAlertOpen(false)}>OK</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
};

export default MessageHistorySection;
