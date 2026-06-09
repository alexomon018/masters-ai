import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useCallback, useState } from "react";
import {
	deleteThreadRemote,
	fetchThreads
} from "@/components/organisms/SideBar/threadsApi";
import {
	fetchWorkerTicket,
	workerHttpBase
} from "@/components/organisms/Chat/helpers/agentAuth";
import { clearPersistedQueryCache } from "@/providers/getQueryClient";

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
				// Account deletion now goes straight to the worker's /users/me,
				// which cascades D1 + DO history, wipes Redis quota and deletes the
				// Clerk identity. Exchange the JWT for a single-use ticket first
				// (keeps the bearer out of the URL/access logs).
				const base = workerHttpBase();
				const jwt = await tokenFn();
				const ticket = jwt ? await fetchWorkerTicket(jwt) : null;
				if (base && ticket) {
					await fetch(
						`${base}/users/me?ticket=${encodeURIComponent(ticket)}`,
						{ method: "DELETE" }
					);
				}

				await queryClient.resetQueries();
				queryClient.clear();
				// clear() only wipes memory — also drop the persisted localStorage
				// copy so the deleted account's threads can't rehydrate.
				clearPersistedQueryCache();

				window.location.href = "/auth";
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
