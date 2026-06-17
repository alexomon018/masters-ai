import { cn } from "@/utils";
import {
	Button,
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@atoms";
import { useDangerZone } from "./useDangerZone";

type DangerZoneSectionProps = {
	className?: string;
	title?: string;
	description?: string;
	buttonText?: string;
	isAccountDeletion?: boolean;
};

const DangerZoneSection = ({
	className,
	title = "Danger Zone",
	description = "Permanently delete your account and all associated data.",
	buttonText = "Delete Account",
	isAccountDeletion = true
}: DangerZoneSectionProps) => {
	const {
		handleDelete,
		isDeletingUser,
		isDeletingAllData,
		isAlertOpen,
		setIsAlertOpen
	} = useDangerZone({ isAccountDeletion });

	return (
		<section className={cn(className)}>
			<h3 className="mb-1 text-base font-medium text-destructive">{title}</h3>
			<p className="mb-4 text-sm text-muted-foreground">{description}</p>
			<Button
				onClick={() => setIsAlertOpen(true)}
				disabled={isDeletingUser || isDeletingAllData}
				variant="destructive"
				className="w-full sm:w-auto"
			>
				{buttonText}
			</Button>

			<AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-destructive">
							{isAccountDeletion ? "Delete Account" : "Delete All Messages"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isAccountDeletion
								? "This action cannot be undone. This will permanently delete your account and all associated data."
								: "This action cannot be undone. This will permanently delete all your messages and conversation history."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button variant="outline" onClick={() => setIsAlertOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeletingUser || isDeletingAllData}
						>
							{isDeletingUser || isDeletingAllData ? "Deleting..." : "Delete"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
};

export default DangerZoneSection;
