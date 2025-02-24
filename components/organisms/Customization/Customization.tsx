"use client";

import { Input, Textarea, Label, Button } from "@atoms";
import { useState, ChangeEvent } from "react";

const Customization = () => {
	const [name, setName] = useState("");
	const [occupation, setOccupation] = useState("");
	const [traits, setTraits] = useState("");
	const [preferences, setPreferences] = useState("");

	const handleSave = () => {
		// TODO: Implement save functionality
		console.log({ name, occupation, traits, preferences });
	};

	return (
		<div className="flex flex-col gap-6 p-6 w-full max-w-3xl">
			<h1 className="text-2xl font-semibold">Customize masters.chat</h1>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="name" className="text-sm font-medium">
						What should masters.chat call you?
					</Label>
					<Input
						id="name"
						placeholder="Enter your name"
						value={name}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							setName(e.target.value)
						}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="occupation" className="text-sm font-medium">
						What do you do?
					</Label>
					<Input
						id="occupation"
						placeholder="Engineer, student, etc."
						value={occupation}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							setOccupation(e.target.value)
						}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="traits" className="text-sm font-medium">
						What traits should masters.chat have?
					</Label>
					<Textarea
						id="traits"
						placeholder="Enter traits separated by commas (e.g. Chatty, Witty, Opinionated)"
						value={traits}
						onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
							setTraits(e.target.value)
						}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="preferences" className="text-sm font-medium">
						Anything else masters.chat should know about you?
					</Label>
					<Textarea
						id="preferences"
						placeholder="Interests, values, or preferences to keep in mind"
						value={preferences}
						onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
							setPreferences(e.target.value)
						}
					/>
				</div>
			</div>
			<Button onClick={handleSave} type="button" className="w-[30%]">
				Save Preferences
			</Button>
		</div>
	);
};

export default Customization;
