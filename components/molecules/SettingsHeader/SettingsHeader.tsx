import { useClerk } from "@clerk/clerk-react";
import { Button } from "@atoms";
import { ArrowLeft } from "lucide-react";
import {
	getQueryClient,
	clearPersistedQueryCache
} from "@/providers/getQueryClient";
import { Link } from "@tanstack/react-router";
import { queryKeys } from "@/constants";

const SettingsHeader = () => {
	const queryClient = getQueryClient();

	const { signOut } = useClerk();

	const onSignOut = async () => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.messageLimit() });
		// Drop the prior identity's threads from memory + the persisted cache so
		// the next session doesn't hydrate them from localStorage on cold load.
		queryClient.removeQueries({ queryKey: queryKeys.threads() });
		clearPersistedQueryCache();
		await signOut();
	};

	return (
		<div className="flex items-center justify-between border-b px-4 py-3">
			<Link
				to="/"
				className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to Chat
			</Link>

			<Button variant="ghost" size="sm" className="text-sm" onClick={onSignOut}>
				Sign out
			</Button>
		</div>
	);
};

export default SettingsHeader;
