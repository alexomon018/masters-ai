import { Avatar, AvatarFallback, AvatarImage, Card } from "@atoms";

interface UserProfileProps {
	name: string;
	email: string;
	avatarUrl?: string;
}

const UserProfile = ({ name, email, avatarUrl }: UserProfileProps) => (
	<Card className="flex items-center gap-4 p-5">
		<Avatar className="size-14 shrink-0">
			{avatarUrl ? (
				<AvatarImage src={avatarUrl} alt={name} />
			) : (
				<AvatarFallback>{name.charAt(0)}</AvatarFallback>
			)}
		</Avatar>
		<div className="min-w-0 flex-1">
			<h3 className="truncate text-base font-semibold">{name}</h3>
			<p className="truncate text-sm text-muted-foreground">{email}</p>
		</div>
	</Card>
);

export default UserProfile;
