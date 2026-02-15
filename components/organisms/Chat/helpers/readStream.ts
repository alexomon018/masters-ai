async function readStream(
	body: ReadableStream<Uint8Array>,
	onChunk: (content: string) => void
): Promise<string> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let fullContent = "";

	let done = false;
	while (!done) {
		// eslint-disable-next-line no-await-in-loop
		const result = await reader.read();
		done = result.done;
		if (result.value) {
			const chunk = decoder.decode(result.value, { stream: !done });
			fullContent += chunk;
			onChunk(fullContent);
		}
	}

	return fullContent;
}

export default readStream;
