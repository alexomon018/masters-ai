import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@atoms";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsHeader() {
	return (
		<div className="flex items-center justify-between border-b p-3 sm:p-4">
			<div className="flex items-center gap-2">
				<Link href="/chat">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 sm:h-10 sm:w-10"
					>
						<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
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
}
