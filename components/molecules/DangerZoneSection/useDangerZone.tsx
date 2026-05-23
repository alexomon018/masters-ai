import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import {
	deleteThreadRemote,
	fetchThreads
} from "@/components/organisms/SideBar/threadsApi";

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
	const { getToken } = useAuth();
	const [isAlertOpen, setIsAlertOpen] = useState(false);

	const tokenFn = useCallback(
		async () =>
			typeof getToken === "function" ? getToken() : null,
		[getToken]
	);

	const { mutateAsync: deleteAllDataMutation, isPending: isDeletingAllData } =
		useMutation({
			mutationFn: async () => {
				// No bulk endpoint yet — fetch and delete one by one. Fine for
				// "Danger Zone" usage where the user clicked a confirm dialog.
				const threads = await fetchThreads(tokenFn);
				await Promise.all(
					threads.map((t) => deleteThreadRemote(tokenFn, t.id))
				);
				queryClient.invalidateQueries();
			}
		});

	const { mutateAsync: deleteUserMutation, isPending: isDeletingUser } =
		useMutation({
			mutationFn: async () => {
				const response = await fetch("/api/delete-user", { method: "DELETE" });
				const result = await response.json();

				await queryClient.resetQueries();
				queryClient.clear();

				window.location.href = "/auth";

				return result;
			}
		});

	const handleDelete = async () => {
		try {
			if (isAccountDeletion) {
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
