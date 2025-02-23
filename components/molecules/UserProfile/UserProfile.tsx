import { Avatar, AvatarFallback, AvatarImage } from "@atoms";

interface UserProfileProps {
	name: string;
	email: string;
	plan: string;
	avatarUrl?: string;
}

const UserProfile = ({ name, email, plan, avatarUrl }: UserProfileProps) => (
	<div className="flex flex-row items-center gap-4 sm:flex-col sm:text-center">
		<Avatar className="size-20 sm:size-32">
			{avatarUrl ? (
				<AvatarImage src={avatarUrl} alt={name} />
			) : (
				<AvatarFallback>{name.charAt(0)}</AvatarFallback>
			)}
		</Avatar>
		<div className="sm:mt-4">
			<h2 className="text-lg font-semibold sm:text-xl">{name}</h2>
			<p className="text-sm text-muted-foreground">{email}</p>
			<span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs">
				{plan}
			</span>
		</div>
	</div>
);

export default UserProfile;
