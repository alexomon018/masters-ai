export const syncJsonToDb = async (json: string) => {
	try {
		const resposne = await fetch("/api/sync", {
			method: "POST",
			body: json,
			headers: {
				"Content-Type": "application/json"
			}
		});

		if (!resposne.ok) {
			throw new Error("Failed to sync json to db");
		}

		return await resposne.json();
	} catch (error) {
		console.error("Failed to sync json to db", error);
		throw error;
	}
};

export const syncDbFromServer = async () => {
	try {
		const response = await fetch("/api/sync");

		if (!response.ok) {
			throw new Error("Failed to sync db from server");
		}

		const json = await response.json();

		const { threads, messages } = json;

		return { threads, messages };
	} catch (error) {
		console.error("Failed to sync db from server", error);
		throw error;
	}
};
