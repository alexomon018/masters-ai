import { useClerk } from "@clerk/clerk-react";
import { Button } from "@atoms";
import { ArrowLeft } from "lucide-react";
import { getQueryClient } from "@/providers/getQueryClient";
import { Link } from "@tanstack/react-router";
import { queryKeys } from "@/constants";

const SettingsHeader = () => {
	const queryClient = getQueryClient();

	const { signOut } = useClerk();

	const onSignOut = async () => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.messageLimit() });
		await signOut();
	};

	return (
		<div className="flex items-center justify-between border-b p-3 sm:p-4">
			<div className="flex items-center gap-2">
				<Link to="/">
					<Button variant="ghost" size="icon" className="size-8 sm:size-10">
						<ArrowLeft className="size-4 sm:size-5" />
					</Button>
				</Link>
				<span className="text-sm sm:text-base">Back to Chat</span>
			</div>

			<Button
				variant="ghost"
				className="text-sm sm:text-base"
				onClick={onSignOut}
			>
				Sign out
			</Button>
		</div>
	);
};

export default SettingsHeader;
