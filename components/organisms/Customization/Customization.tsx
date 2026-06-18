import { Input, Textarea, Label, Button } from "@atoms";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useUser } from "@clerk/clerk-react";
import { usePostHog } from "@posthog/react";

type FormValues = {
	name: string;
	occupation: string;
	traits: string;
	preferences: string;
};

const Customization = () => {
	const { user } = useUser();
	const posthog = usePostHog();

	// Get initial values from user metadata if available
	const initialValues = useMemo<FormValues>(
		() => ({
			name: (user?.unsafeMetadata?.name as string) || "",
			occupation: (user?.unsafeMetadata?.occupation as string) || "",
			traits: (user?.unsafeMetadata?.traits as string) || "",
			preferences: (user?.unsafeMetadata?.preferences as string) || ""
		}),
		[user?.unsafeMetadata]
	);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting }
	} = useForm<FormValues>({
		defaultValues: initialValues
	});

	// Sync the form only when the Clerk metadata actually changes, so live edits
	// aren't wiped by re-renders.
	useEffect(() => {
		reset(initialValues);
	}, [initialValues, reset]);

	const onSubmit = async (data: FormValues) => {
		if (!user) return;
		await user.update({
			unsafeMetadata: {
				name: data.name,
				occupation: data.occupation,
				traits: data.traits,
				preferences: data.preferences
			}
		});
		posthog.capture("customization_saved", {
			has_name: data.name.length > 0,
			has_occupation: data.occupation.length > 0,
			has_traits: data.traits.length > 0,
			has_preferences: data.preferences.length > 0
		});
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<h1 className="text-xl font-semibold tracking-tight">
				Customize masters.chat
			</h1>

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="name" className="text-sm font-medium">
						What should masters.chat call you?
					</Label>
					<Input
						id="name"
						placeholder="Enter your name"
						{...register("name")}
						aria-invalid={errors.name ? "true" : "false"}
					/>
					{errors.name && (
						<p className="mt-1 text-sm text-destructive">
							{errors.name.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="occupation" className="text-sm font-medium">
						What do you do?
					</Label>
					<Input
						id="occupation"
						placeholder="Engineer, student, etc."
						{...register("occupation")}
						aria-invalid={errors.occupation ? "true" : "false"}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="traits" className="text-sm font-medium">
						What traits should masters.chat have?
					</Label>
					<Textarea
						id="traits"
						placeholder="Enter traits separated by commas (e.g. Chatty, Witty, Opinionated)"
						{...register("traits")}
						aria-invalid={errors.traits ? "true" : "false"}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="preferences" className="text-sm font-medium">
						Anything else masters.chat should know about you?
					</Label>
					<Textarea
						id="preferences"
						placeholder="Interests, values, or preferences to keep in mind"
						{...register("preferences")}
						aria-invalid={errors.preferences ? "true" : "false"}
					/>
				</div>

				<div className="flex justify-end">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : "Save Preferences"}
					</Button>
				</div>
			</form>
		</div>
	);
};

export default Customization;
