import { useState } from "react";
import { dxdb, DEX_Thread, DEX_Message } from "@/localdb/dexie";
import SuperJSON from "superjson";

interface MessageHistoryData {
	threads: DEX_Thread[];
	messages: DEX_Message[];
}

const useMessageHistory = () => {
	const [isImporting, setIsImporting] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [alertOpen, setAlertOpen] = useState(false);
	const [alertTitle, setAlertTitle] = useState("");
	const [alertDescription, setAlertDescription] = useState("");
	const [alertType, setAlertType] = useState<"success" | "error">("success");

	const showAlert = (
		title: string,
		description: string,
		type: "success" | "error" = "success"
	) => {
		setAlertTitle(title);
		setAlertDescription(description);
		setAlertType(type);
		setAlertOpen(true);
	};

	const exportToJson = async () => {
		try {
			setIsExporting(true);

			// Fetch all threads and messages from IndexedDB
			const [threads, messages] = await Promise.all([
				dxdb.threads.toArray(),
				dxdb.messages.toArray()
			]);

			// Create a JSON object with the data
			const exportData: MessageHistoryData = { threads, messages };

			// Convert to JSON string
			const jsonString = SuperJSON.stringify(exportData);

			// Create a blob with the JSON data
			const blob = new Blob([jsonString], { type: "application/json" });

			// Create a download link and trigger the download
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `chat-history-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(link);
			link.click();

			// Clean up
			URL.revokeObjectURL(url);
			document.body.removeChild(link);

			showAlert(
				"Export Successful",
				`Successfully exported ${threads.length} threads and ${messages.length} messages.`,
				"success"
			);
		} catch (error) {
			console.error("Error exporting data:", error);
			showAlert(
				"Export Failed",
				"There was a problem exporting your data. Please try again.",
				"error"
			);
		} finally {
			setIsExporting(false);
		}
	};

	const importFromJson = async () => {
		try {
			setIsImporting(true);

			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = "application/json";

			const handleCancel = () => {
				setTimeout(() => {
					if (!fileInput.files || fileInput.files.length === 0) {
						setIsImporting(false);
					}
				}, 300);
			};

			window.addEventListener("focus", handleCancel, { once: true });

			fileInput.onchange = async (event) => {
				window.removeEventListener("focus", handleCancel);

				const target = event.target as HTMLInputElement;
				const file = target.files?.[0];

				if (!file) {
					setIsImporting(false);
					return;
				}

				try {
					// Read the file
					const text = await file.text();

					// Parse the JSON data
					const importData = SuperJSON.parse(text) as MessageHistoryData;

					// Get existing data from IndexedDB
					const [existingThreads, existingMessages] = await Promise.all([
						dxdb.threads.toArray(),
						dxdb.messages.toArray()
					]);

					// Create maps for efficient lookups
					const existingThreadMap = new Map(
						existingThreads.map((t) => [t.id, t])
					);
					const existingMessageMap = new Map(
						existingMessages.map((m) => [m.id, m])
					);

					// Filter imported threads and messages to only include new ones
					const threadsToAdd = importData.threads.filter(
						(thread) => !existingThreadMap.has(thread.id)
					);
					const messagesToAdd = importData.messages.filter(
						(message) => !existingMessageMap.has(message.id)
					);

					// Add new items to IndexedDB
					await dxdb.transaction(
						"rw",
						[dxdb.threads, dxdb.messages],
						async () => {
							if (threadsToAdd.length > 0) {
								await dxdb.threads.bulkAdd(threadsToAdd);
							}

							if (messagesToAdd.length > 0) {
								await dxdb.messages.bulkAdd(messagesToAdd);
							}
						}
					);

					showAlert(
						"Import Complete",
						`Successfully added ${threadsToAdd.length} threads and ${messagesToAdd.length} messages.`,
						"success"
					);
				} catch (error) {
					console.error("Error processing import file:", error);
					showAlert(
						"Import Failed",
						"There was a problem with the file format. Please ensure it's a valid JSON export.",
						"error"
					);
				} finally {
					setIsImporting(false);
				}
			};

			fileInput.click();
		} catch (error) {
			console.error("Error importing data:", error);
			showAlert(
				"Import Failed",
				"There was a problem starting the import process. Please try again.",
				"error"
			);
			setIsImporting(false);
		}
	};

	return {
		exportToJson,
		importFromJson,
		isImporting,
		isExporting,
		alertOpen,
		setAlertOpen,
		alertTitle,
		alertDescription,
		alertType
	};
};

export default useMessageHistory;
