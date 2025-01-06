import { ArrowRight } from "lucide-react";
import Image from "next/image";

interface ExpertCardProps {
	name: string;
	title: string;
	image: string;
}

const ExpertCard = ({ name, title, image }: ExpertCardProps) => (
	<div className="group flex cursor-pointer items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80">
		<div className="flex items-center gap-4">
			<Image
				src={image}
				alt={name}
				width={48}
				height={48}
				className="rounded-full"
			/>
			<div>
				<h4 className="font-semibold">{name}</h4>
				<p className="text-sm text-muted-foreground">{title}</p>
			</div>
		</div>
		<ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
	</div>
);

export default ExpertCard;
