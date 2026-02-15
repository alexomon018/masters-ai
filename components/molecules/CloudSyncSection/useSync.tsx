import { useMutation, useQuery } from "@tanstack/react-query";
import { DEX_Message, DEX_Thread, dxdb } from "@/localdb/dexie";
import { useCallback, useEffect, useState } from "react";
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
		true
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
	const { mutateAsync: syncJsonToDb } = useMutation<
		SyncResponse,
		Error,
		string
	>({
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
				// eslint-disable-next-line no-console
				console.error("Failed to sync json to db", error);
				throw error;
			}
		}
	});

	// Query to get data from server
	const { isLoading: isSyncDataLoading, refetch: refetchSync } = useQuery<
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
				// eslint-disable-next-line no-console
				console.error("Failed to sync db from server", error);
				throw error;
			}
		}
	});

	// Export local DB to server
	const exportDBToServer = useCallback(async (): Promise<void> => {
		if (!isCloudSyncEnabled || !user?.id) return;

		const threads = await dxdb.threads.toArray();
		const messages = await dxdb.messages.toArray();

		const jsonString = SuperJSON.stringify({
			threads,
			messages
		});

		await syncJsonToDb(jsonString);
	}, [isCloudSyncEnabled, user?.id, syncJsonToDb]);

	// Import data from server and merge with local data
	const importDBFromServer = useCallback(
		async (shouldRefetch: boolean = false): Promise<void> => {
			if (isSyncDataLoading || isSyncing || !isCloudSyncEnabled || !user?.id)
				return;
			setIsSyncing(true);

			try {
				let serverData: SyncData | undefined;

				if (shouldRefetch) {
					// Only refetch if explicitly requested
					const result = await refetchSync();
					serverData = result.data;
				}

				if (!serverData) return;

				const {
					json: { threads: serverThreads, messages: serverMessages }
				} = serverData;

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
				await dxdb.transaction(
					"rw",
					[dxdb.threads, dxdb.messages],
					async () => {
						await dxdb.threads.clear();
						await dxdb.messages.clear();

						if (mergedThreads.length > 0) {
							await dxdb.threads.bulkAdd(mergedThreads);
						}
						if (mergedMessages.length > 0) {
							await dxdb.messages.bulkAdd(mergedMessages);
						}
					}
				);

				// Check if we have newer local data that needs to be synced back
				const newerThreads = mergedThreads.filter((t) => {
					const serverThread = serverThreads.find((st) => st.id === t.id);
					const isNewer =
						!serverThread ||
						(t.updated_at &&
							serverThread.updated_at &&
							new Date(t.updated_at) > new Date(serverThread.updated_at));

					return isNewer;
				});

				const newerMessages = mergedMessages.filter((m) => {
					const serverMessage = serverMessages.find((sm) => sm.id === m.id);
					const isNewer =
						!serverMessage ||
						(m.created_at &&
							serverMessage.created_at &&
							new Date(m.created_at) > new Date(serverMessage.created_at));

					return isNewer;
				});

				const hasNewerLocalData =
					newerThreads.length > 0 || newerMessages.length > 0;

				if (hasNewerLocalData) {
					await exportDBToServer();
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error("Error during sync:", error);
			} finally {
				setIsSyncing(false);
			}
		},
		[
			isSyncDataLoading,
			isSyncing,
			isCloudSyncEnabled,
			user?.id,
			refetchSync,
			exportDBToServer
		]
	);

	// Trigger sync only when enabled or user changes
	useEffect(() => {
		const performSync = async () => {
			if (
				isCloudSyncEnabled &&
				!!user?.id &&
				!isSyncDataLoading &&
				!isSyncing
			) {
				await importDBFromServer(false); // Don't refetch on initial sync
			}
		};

		performSync();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isCloudSyncEnabled, user?.id, importDBFromServer]);

	// Modified return to include a manual sync function
	const manualSync = useCallback(async () => {
		await importDBFromServer(true);
	}, [importDBFromServer]);

	return {
		importDBFromServer: manualSync,
		exportDBToServer,
		isCloudSyncEnabled,
		setIsCloudSyncEnabled,
		isSyncing,
		refetchSync
	};
};

export default useSync;
