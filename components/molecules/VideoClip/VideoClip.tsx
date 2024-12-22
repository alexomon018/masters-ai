import { Play } from "lucide-react";
import Image from "next/image";
import { Button } from "@atoms";

interface VideoClipProps {
	title: string;
	thumbnail: string;
}

const VideoClip = ({ title, thumbnail }: VideoClipProps) => (
	<div className="group relative w-[300px] shrink-0 cursor-pointer">
		<div className="relative aspect-video overflow-hidden rounded-xl">
			<Image src={thumbnail} alt={title} fill className="object-cover" />
			<div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/30" />
			<Button className="absolute inset-0 flex h-full items-center justify-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
					<Play className="size-6 fill-white text-white" />
				</div>
			</Button>
		</div>
		<h3 className="mt-2 text-sm font-medium">{title}</h3>
	</div>
);

export default VideoClip;
