import { dxdb } from "@/localdb/dexie";
import {
	UseMutateFunction,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";

interface UseDangerZoneReturn {
	isPending: boolean;
	deleteAllData: UseMutateFunction<void, Error, void, unknown>;
}

export function useDangerZone(): UseDangerZoneReturn {
	const queryClient = useQueryClient();

	// Create a mutation for deleting all user data
	const { mutate: deleteAllDataMutation, isPending } = useMutation({
		mutationFn: async () => {
			try {
				// 1. Delete from server first
				const response = await fetch("/api/sync", {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ deleteAll: true })
				});

				const result = await response.json();

				// 2. Delete from local IndexedDB
				await dxdb.deleteEverything();

				// 3. Invalidate all queries to refresh data
				queryClient.invalidateQueries();

				return result;
			} catch (error) {
				console.error("Error deleting data:", error);
				const errorMessage =
					error instanceof Error ? error.message : "Failed to delete data";
				console.error(errorMessage);
				throw error;
			}
		}
	});

	/**
	 * Deletes all threads and messages from both local IndexedDB and the server
	 */

	return {
		isPending,
		deleteAllData: deleteAllDataMutation
	};
}
