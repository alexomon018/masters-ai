import { useState } from "react";
import { Card, Input, Label, Button, CustomIcon } from "@atoms";
import { useApiKeysManager } from "./useApiKeysManager";
import type { KeyProvider } from "./userKeysApi";

const ProviderRow = ({
	provider,
	label,
	placeholder,
	connected,
	pending,
	error,
	onSave,
	onDisconnect,
	onClearError
}: {
	provider: KeyProvider;
	label: string;
	placeholder: string;
	connected: { lastFour: string } | undefined;
	pending: boolean;
	error: string | undefined;
	onSave: (value: string) => Promise<boolean>;
	onDisconnect: () => void;
	onClearError: () => void;
}) => {
	const [value, setValue] = useState("");

	return (
		<Card className="flex flex-col gap-3 p-5">
			<div className="flex items-center gap-3">
				<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
					<CustomIcon icon={provider} />
				</div>
				<div>
					<h3 className="text-sm font-medium">{label}</h3>
					{connected ? (
						<p className="text-sm text-muted-foreground">
							Connected · ending in {connected.lastFour}
						</p>
					) : (
						<p className="text-sm text-muted-foreground">Not connected</p>
					)}
				</div>
			</div>

			{connected ? (
				<Button
					variant="outline"
					className="w-fit"
					disabled={pending}
					onClick={onDisconnect}
				>
					{pending ? "Removing..." : "Disconnect"}
				</Button>
			) : (
				<form
					className="space-y-2"
					onSubmit={async (e) => {
						e.preventDefault();
						const saved = await onSave(value);
						if (saved) setValue("");
					}}
				>
					<Label htmlFor={`key-${provider}`} className="text-sm font-medium">
						{label} API key
					</Label>
					<div className="flex gap-2">
						<Input
							id={`key-${provider}`}
							type="password"
							autoComplete="off"
							placeholder={placeholder}
							value={value}
							onChange={(e) => {
								setValue(e.target.value);
								if (error) onClearError();
							}}
						/>
						<Button
							type="submit"
							disabled={pending || value.trim().length === 0}
						>
							{pending ? "Connecting..." : "Connect"}
						</Button>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
				</form>
			)}
		</Card>
	);
};

const ApiKeysManager = () => {
	const { providers, save, disconnect, clearError, pending, errors } =
		useApiKeysManager();

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="space-y-1">
				<h1 className="text-xl font-semibold tracking-tight">API Keys</h1>
				<p className="text-sm text-muted-foreground">
					Connect your own provider key to unlock frontier models. Usage is
					billed directly to your provider account — your key is encrypted at
					rest and never shown again after you save it.
				</p>
			</div>

			<div className="space-y-4">
				{providers.map((p) => (
					<ProviderRow
						key={p.provider}
						provider={p.provider}
						label={p.label}
						placeholder={p.placeholder}
						connected={p.connected}
						pending={pending === p.provider}
						error={errors[p.provider]}
						onSave={(value) => save(p.provider, value)}
						onDisconnect={() => disconnect(p.provider)}
						onClearError={() => clearError(p.provider)}
					/>
				))}
			</div>
		</div>
	);
};

export default ApiKeysManager;
