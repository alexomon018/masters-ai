import { useCallback, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@constants";
import { useTokenFn } from "@hooks";
import { authSubject } from "@/components/organisms/Chat/helpers/agentAuth";
import {
	deleteUserKey,
	fetchUserKeys,
	saveUserKey,
	type KeyProvider,
	type UserKeyDto
} from "./userKeysApi";

export interface ProviderState {
	provider: KeyProvider;
	label: string;
	placeholder: string;
	connected: UserKeyDto | undefined;
}

const PROVIDERS: Array<{
	provider: KeyProvider;
	label: string;
	placeholder: string;
}> = [
	{ provider: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
	{ provider: "openai", label: "OpenAI", placeholder: "sk-..." }
];

export const useApiKeysManager = () => {
	const tokenFn = useTokenFn();
	const queryClient = useQueryClient();
	const { user } = useUser();

	const userKeysQueryKey = queryKeys.userKeys(authSubject(user?.id));

	const { data: keys = [] } = useQuery({
		queryKey: userKeysQueryKey,
		queryFn: () => fetchUserKeys(tokenFn)
	});

	const [pending, setPending] = useState<KeyProvider | null>(null);
	const [errors, setErrors] = useState<Partial<Record<KeyProvider, string>>>({});

	const providers = useMemo<ProviderState[]>(
		() =>
			PROVIDERS.map((p) => ({
				...p,
				connected: keys.find((k) => k.provider === p.provider)
			})),
		[keys]
	);

	const save = useCallback(
		async (provider: KeyProvider, apiKey: string) => {
			setPending(provider);
			setErrors((prev) => ({ ...prev, [provider]: undefined }));
			try {
				const result = await saveUserKey(tokenFn, provider, apiKey.trim());
				if (!result.ok) {
					setErrors((prev) => ({ ...prev, [provider]: result.error }));
					return false;
				}
				await queryClient.invalidateQueries({ queryKey: userKeysQueryKey });
				return true;
			} finally {
				setPending(null);
			}
		},
		[tokenFn, queryClient, userKeysQueryKey]
	);

	const disconnect = useCallback(
		async (provider: KeyProvider) => {
			setPending(provider);
			setErrors((prev) => ({ ...prev, [provider]: undefined }));
			try {
				const ok = await deleteUserKey(tokenFn, provider);
				if (!ok) {
					setErrors((prev) => ({
						...prev,
						[provider]: "Failed to disconnect key"
					}));
					return;
				}
				await queryClient.invalidateQueries({ queryKey: userKeysQueryKey });
			} finally {
				setPending(null);
			}
		},
		[tokenFn, queryClient, userKeysQueryKey]
	);

	return { providers, save, disconnect, pending, errors };
};

export default useApiKeysManager;
