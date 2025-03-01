import { useMutation, useQuery } from "@tanstack/react-query";
import { DEX_Message, DEX_Thread, dxdb } from "@/localdb/dexie";
import { useEffect } from "react";
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

	const { user } = useUser();

	const { mutate: syncJsonToDb } = useMutation<SyncResponse, Error, string>({
		mutationFn: async (json: string) => {
			try {
				const resposne = await fetch("/api/sync", {
					method: "POST",
					body: JSON.stringify({
						json
					}),
					headers: {
						"Content-Type": "application/json"
					}
				});

				if (!resposne.ok) {
					throw new Error("Failed to sync json to db");
				}

				return await resposne.json();
			} catch (error) {
				console.error("Failed to sync json to db", error);
				throw error;
			}
		}
	});

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

	const exportDBToServer = async (): Promise<void> => {
		const threads = await dxdb.threads.toArray();
		const messages = await dxdb.messages.toArray();

		const jsonString = SuperJSON.stringify({
			threads,
			messages
		});

		syncJsonToDb(jsonString);
	};

	const importDBFromServer = async (): Promise<void> => {
		if (isSyncDataLoading) return;

		if (!syncData) return;

		const {
			json: { threads, messages }
		} = syncData;

		await dxdb.transaction("rw", [dxdb.threads, dxdb.messages], async () => {
			await dxdb.threads.clear();
			await dxdb.messages.clear();

			if (threads && threads.length > 0) {
				await dxdb.threads.bulkAdd(threads as DEX_Thread[]);
			}
			if (messages && messages.length > 0) {
				await dxdb.messages.bulkAdd(messages as DEX_Message[]);
			}
		});
	};

	useEffect(() => {
		if (isCloudSyncEnabled && !!user?.id && !isSyncDataLoading) {
			importDBFromServer();
		}
	}, [isCloudSyncEnabled, isSyncDataLoading, user?.id]);

	return {
		importDBFromServer,
		exportDBToServer,
		isCloudSyncEnabled,
		setIsCloudSyncEnabled
	};
};

export default useSync;
