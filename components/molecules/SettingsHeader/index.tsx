import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@atoms";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const SettingsHeader = () => (
	<div className="flex items-center justify-between border-b p-3 sm:p-4">
		<div className="flex items-center gap-2">
			<Link href="/chat">
				<Button variant="ghost" size="icon" className="size-8 sm:size-10">
					<ArrowLeft className="size-4 sm:size-5" />
				</Button>
			</Link>
			<span className="text-sm sm:text-base">Back to Chat</span>
		</div>
		<SignOutButton>
			<Button variant="ghost" className="text-sm sm:text-base">
				Sign out
			</Button>
		</SignOutButton>
	</div>
);

export default SettingsHeader;
