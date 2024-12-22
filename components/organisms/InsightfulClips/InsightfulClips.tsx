import { VideoClip } from "@molecules";
import React from "react";

const InsightfulClips = () => (
	<div className="mb-16">
		<h2 className="mb-8 text-2xl font-bold">
			Insightful clips to
			<br />
			expand your view
		</h2>
		<div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
			<VideoClip
				title="Harnessing Hormetic Stress"
				thumbnail="/placeholder.svg?height=169&width=300"
			/>
			<VideoClip
				title="Embracing Good Stress"
				thumbnail="/placeholder.svg?height=169&width=300"
			/>
			<VideoClip
				title="Morning Sunlight Benefits"
				thumbnail="/placeholder.svg?height=169&width=300"
			/>
			<VideoClip
				title="Sleep Optimization Tips"
				thumbnail="/placeholder.svg?height=169&width=300"
			/>
			<VideoClip
				title="Cold Plunge Benefits"
				thumbnail="/placeholder.svg?height=169&width=300"
			/>
			<VideoClip
				title="Embracing Connection"
				thumbnail="/placeholder.svg?height=169&width=300"
			/>
		</div>
	</div>
);

export default InsightfulClips;
