import { routeAgentRequest } from "agents";
import { MastersChatAgent } from "./agent";
import { authenticateAgentConnection } from "./clerk-auth";
import { issueTicket } from "./auth-ticket";
import {
	claimAnonThreads,
	deleteAllForUser as deleteAllForUserRoute,
	deleteThread as deleteThreadRoute,
	listThreads,
	upsertBodySchema,
	upsertThread
} from "./routes/threads";
import { checkThreadAccess, extractThreadId } from "./thread-access";
import type { Env } from "./env";

export { MastersChatAgent };

function resolveAllowedOrigin(env: Env, requestOrigin: string | null): string | null {
	if (!requestOrigin) return null;
	const allowed = (env.ALLOWED_ORIGINS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	return allowed.includes(requestOrigin) ? requestOrigin : null;
}

function corsHeaders(env: Env, requestOrigin: string | null): Record<string, string> {
	const allowOrigin = resolveAllowedOrigin(env, requestOrigin);
	const base: Record<string, string> = {
		"access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
		"access-control-allow-headers": "content-type,authorization",
		"access-control-max-age": "86400",
		vary: "Origin"
	};
	if (allowOrigin) {
		base["access-control-allow-origin"] = allowOrigin;
	}
	return base;
}

function withCorsHeaders(
	response: Response,
	env: Env,
	requestOrigin: string | null
): Response {
	const headers = new Headers(response.headers);
	for (const [k, v] of Object.entries(corsHeaders(env, requestOrigin))) {
		headers.set(k, v);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

const THREADS_ITEM_RE = /^\/threads\/([^/]+)$/;

async function handleAuthenticated(
	request: Request,
	env: Env,
	handler: (userId: string) => Promise<Response>
): Promise<Response> {
	const auth = await authenticateAgentConnection(request, env);
	if ("error" in auth) {
		return new Response(auth.error, { status: 401 });
	}
	return handler(auth.userId);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get("origin");

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(env, origin)
			});
		}

		if (url.pathname === "/ws-ticket" && request.method === "POST") {
			const result = await issueTicket(
				env,
				request.headers.get("authorization")
			);
			if (!result) {
				return withCorsHeaders(
					new Response("Unauthorized", { status: 401 }),
					env,
					origin
				);
			}
			return withCorsHeaders(
				new Response(JSON.stringify(result), {
					status: 200,
					headers: { "content-type": "application/json" }
				}),
				env,
				origin
			);
		}

		if (url.pathname === "/threads" && request.method === "GET") {
			return withCorsHeaders(
				await handleAuthenticated(request, env, (userId) =>
					listThreads(env, { userId })
				),
				env,
				origin
			);
		}

		if (url.pathname === "/threads" && request.method === "POST") {
			return withCorsHeaders(
				await handleAuthenticated(request, env, async (userId) => {
					const raw = await request.json().catch(() => null);
					const parsed = upsertBodySchema.safeParse(raw);
					if (!parsed.success) {
						return new Response(
							JSON.stringify({
								error: "invalid body",
								issues: parsed.error.issues
							}),
							{
								status: 400,
								headers: { "content-type": "application/json" }
							}
						);
					}
					return upsertThread(env, { userId }, parsed.data);
				}),
				env,
				origin
			);
		}

		if (url.pathname === "/threads/claim-anon" && request.method === "POST") {
			const auth = await authenticateAgentConnection(request, env);
			if ("error" in auth) {
				return withCorsHeaders(
					new Response(auth.error, { status: 401 }),
					env,
					origin
				);
			}
			if (!auth.isAuthenticated) {
				return withCorsHeaders(
					new Response("Unauthorized", { status: 401 }),
					env,
					origin
				);
			}
			const anonId = url.searchParams.get("anonId");
			if (!anonId) {
				return withCorsHeaders(
					new Response(JSON.stringify({ error: "anonId required" }), {
						status: 400,
						headers: { "content-type": "application/json" }
					}),
					env,
					origin
				);
			}
			return withCorsHeaders(
				await claimAnonThreads(env, { userId: auth.userId }, anonId),
				env,
				origin
			);
		}

		const threadsItemMatch = THREADS_ITEM_RE.exec(url.pathname);
		if (threadsItemMatch && request.method === "DELETE") {
			return withCorsHeaders(
				await handleAuthenticated(request, env, (userId) =>
					deleteThreadRoute(env, { userId }, threadsItemMatch[1])
				),
				env,
				origin
			);
		}

		if (url.pathname === "/users/me" && request.method === "DELETE") {
			return withCorsHeaders(
				await handleAuthenticated(request, env, (userId) =>
					deleteAllForUserRoute(env, { userId })
				),
				env,
				origin
			);
		}

		const authAndForward = async (req: Request) => {
			const auth = await authenticateAgentConnection(req, env);
			if ("error" in auth) {
				return new Response(auth.error, { status: 401 });
			}

			const threadId = extractThreadId(new URL(req.url).pathname);
			if (threadId) {
				const access = await checkThreadAccess(env, auth.userId, threadId);
				if (!access.ok) {
					return new Response(access.reason, { status: access.status });
				}
			}

			const forwarded = new Request(req, {
				headers: new Headers(req.headers)
			});
			forwarded.headers.set("x-masters-user-id", auth.userId);
			forwarded.headers.set(
				"x-masters-is-authenticated",
				auth.isAuthenticated ? "1" : "0"
			);
			return forwarded;
		};

		const response = await routeAgentRequest(request, env, {
			cors: true,
			onBeforeConnect: authAndForward,
			onBeforeRequest: authAndForward
		});

		return response ?? new Response("Not found", { status: 404 });
	}
} satisfies ExportedHandler<Env>;
