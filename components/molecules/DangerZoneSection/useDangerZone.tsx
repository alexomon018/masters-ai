import { dxdb } from "@/localdb/dexie";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface UseDangerZoneReturn {
	isDeletingAllData: boolean;
	isDeletingUser: boolean;
	handleDelete: () => Promise<void>;
	isAlertOpen: boolean;
	setIsAlertOpen: (isOpen: boolean) => void;
}

export const useDangerZone = ({
	isAccountDeletion = true
}: {
	isAccountDeletion?: boolean;
}): UseDangerZoneReturn => {
	const queryClient = useQueryClient();
	const [isAlertOpen, setIsAlertOpen] = useState(false);

	// Create a mutation for deleting all user data
	const { mutateAsync: deleteAllDataMutation, isPending: isDeletingAllData } =
		useMutation({
			mutationFn: async () => {
				try {
					const response = await fetch("/api/sync", {
						method: "DELETE",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify({ deleteAll: true })
					});

					const result = await response.json();

					await Promise.all([dxdb.messages.clear(), dxdb.threads.clear()]);

					queryClient.invalidateQueries();

					return result;
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error("Error deleting data:", error);
					const errorMessage =
						error instanceof Error ? error.message : "Failed to delete data";
					// eslint-disable-next-line no-console
					console.error(errorMessage);
					throw error;
				}
			}
		});

	const { mutateAsync: deleteUserMutation, isPending: isDeletingUser } =
		useMutation({
			mutationFn: async () => {
				try {
					const response = await fetch("/api/delete-user", {
						method: "DELETE"
					});

					const result = await response.json();

					// Clear all React Query cache and invalidate queries
					await queryClient.resetQueries();
					queryClient.clear();

					// Redirect to login page after successful deletion
					window.location.href = "/auth";

					return result;
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error("Error deleting user:", error);
					throw error;
				}
			}
		});

	const handleDelete = async () => {
		try {
			if (isAccountDeletion) {
				// First delete all data, then delete user
				await deleteAllDataMutation();
				await deleteUserMutation();
			} else {
				await deleteAllDataMutation();
			}
			setIsAlertOpen(false);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error during deletion:", error);
			setIsAlertOpen(false);
		}
	};

	return {
		isDeletingAllData,
		isDeletingUser,
		handleDelete,
		isAlertOpen,
		setIsAlertOpen
	};
};
