import { useMutation, useQuery } from "@tanstack/react-query";
import { DEX_Message, DEX_Thread, dxdb } from "@/localdb/dexie";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import { queryKeys } from "@/constants";
import { useLocalStorage } from "@/hooks";
import { useUser } from "@clerk/nextjs";

interface SyncResponse {
	success: boolean;
}

// Define sync data type
interface SyncData {
	json: {
		threads: DEX_Thread[];
		messages: DEX_Message[];
	};
}

const useSync = () => {
	const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useLocalStorage(
		"isCloudSyncEnabled",
		false
	);
	const [isSyncing, setIsSyncing] = useState(false);

	const { user } = useUser();

	// Function to merge data with a smart strategy
	const mergeData = <
		T extends { id: string; created_at?: Date; updated_at?: Date }
	>(
		localItems: T[],
		serverItems: T[],
		compareField: "created_at" | "updated_at" = "updated_at"
	): T[] => {
		// Create maps for efficient lookups
		const serverMap = new Map(
			serverItems?.map((item) => [item.id, item]) || []
		);
		const result: T[] = [];

		// First, process local items
		localItems.forEach((localItem) => {
			const serverItem = serverMap.get(localItem.id);

			// Keep local item if:
			// 1. It doesn't exist on server, or
			// 2. Local version is newer than server version
			if (
				!serverItem ||
				(localItem[compareField] &&
					serverItem[compareField] &&
					new Date(localItem[compareField]!) >
						new Date(serverItem[compareField]!))
			) {
				result.push(localItem);
				serverMap.delete(localItem.id);
			}
		});

		// Add remaining server items
		serverMap.forEach((item) => result.push(item));

		return result;
	};

	// Mutation to sync data to server
	const { mutate: syncJsonToDb } = useMutation<SyncResponse, Error, string>({
		mutationFn: async (json: string) => {
			try {
				const response = await fetch("/api/sync", {
					method: "POST",
					body: JSON.stringify({ json }),
					headers: { "Content-Type": "application/json" }
				});

				if (!response.ok) {
					throw new Error("Failed to sync json to db");
				}

				return await response.json();
			} catch (error) {
				console.error("Failed to sync json to db", error);
				throw error;
			}
		}
	});

	// Query to get data from server
	const { data: syncData, isLoading: isSyncDataLoading } = useQuery<
		SyncData,
		Error
	>({
		queryKey: queryKeys.sync(),
		enabled: isCloudSyncEnabled && !!user?.id,
		queryFn: async () => {
			try {
				const response = await fetch("/api/sync");
				if (!response.ok) {
					throw new Error("Failed to sync db from server");
				}
				return await response.json();
			} catch (error) {
				console.error("Failed to sync db from server", error);
				throw error;
			}
		}
	});

	// Export local DB to server
	const exportDBToServer = async (): Promise<void> => {
		const threads = await dxdb.threads.toArray();
		const messages = await dxdb.messages.toArray();

		const jsonString = SuperJSON.stringify({
			threads,
			messages
		});

		syncJsonToDb(jsonString);
	};

	// Import data from server and merge with local data
	const importDBFromServer = async (): Promise<void> => {
		if (isSyncDataLoading || isSyncing) return;
		setIsSyncing(true);

		try {
			if (!syncData) return;

			const {
				json: { threads: serverThreads, messages: serverMessages }
			} = syncData;

			// Get local data
			const localThreads = await dxdb.threads.toArray();
			const localMessages = await dxdb.messages.toArray();

			// Merge data using our smart strategy
			const mergedThreads = mergeData(
				localThreads,
				serverThreads,
				"updated_at"
			);
			const mergedMessages = mergeData(
				localMessages,
				serverMessages,
				"created_at"
			);

			// Update database with merged data
			await dxdb.transaction("rw", [dxdb.threads, dxdb.messages], async () => {
				await dxdb.threads.clear();
				await dxdb.messages.clear();

				if (mergedThreads.length > 0) {
					await dxdb.threads.bulkAdd(mergedThreads);
				}
				if (mergedMessages.length > 0) {
					await dxdb.messages.bulkAdd(mergedMessages);
				}
			});

			// Check if we have newer local data that needs to be synced back
			const hasNewerLocalData =
				mergedThreads.some(
					(t) =>
						!serverThreads.some(
							(st) =>
								st.id === t.id &&
								t.updated_at &&
								st.updated_at &&
								new Date(t.updated_at) <= new Date(st.updated_at)
						)
				) ||
				mergedMessages.some(
					(m) =>
						!serverMessages.some(
							(sm) =>
								sm.id === m.id &&
								m.created_at &&
								sm.created_at &&
								new Date(m.created_at) <= new Date(sm.created_at)
						)
				);

			if (hasNewerLocalData) {
				console.log("Exporting DB to server");
				await exportDBToServer();
			}
		} catch (error) {
			console.error("Error during sync:", error);
		} finally {
			setIsSyncing(false);
		}
	};

	// Trigger sync when enabled
	// TODO: Needs checking runs twice
	useEffect(() => {
		if (isCloudSyncEnabled && !!user?.id && !isSyncDataLoading && !isSyncing) {
			importDBFromServer();
		}
	}, [isCloudSyncEnabled, isSyncDataLoading, user?.id]);

	return {
		importDBFromServer,
		exportDBToServer,
		isCloudSyncEnabled,
		setIsCloudSyncEnabled,
		isSyncing
	};
};

export default useSync;
