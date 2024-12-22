import { Button, Input } from "@atoms";
import { ArrowRight } from "lucide-react";
import React from "react";

const AskSection = () => (
	<div className="mb-16 text-center">
		<h1 className="mb-4 text-4xl font-bold lg:text-5xl">
			Unlock Expert Knowledge, Instantly
		</h1>
		<p className="mb-8 text-muted-foreground">
			Ask anything and get answers directly from trusted experts.
		</p>
		<div className="relative mx-auto max-w-2xl">
			<Input
				type="text"
				placeholder="Ask anything"
				className="h-14 rounded-full pl-12 pr-4 text-lg"
			/>
			<div className="absolute left-4 top-1/2 -translate-y-1/2">
				<div className="size-6 rounded-sm bg-foreground" />
			</div>
			<Button
				size="icon"
				className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
			>
				<ArrowRight className="size-4" />
			</Button>
		</div>
	</div>
);

export default AskSection;
