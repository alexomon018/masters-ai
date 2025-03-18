"use client";

import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

const CodeBlock = ({ children }: { children: string; className?: string }) => {
	const [isCopied, setIsCopied] = useState(false);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(children.trim());
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	return (
		<div className="group relative">
			<div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
				<button
					onClick={copyToClipboard}
					type="button"
					className="rounded bg-[#333] px-2 py-1 text-xs text-gray-300 hover:bg-[#444]"
				>
					{isCopied ? "Copied!" : "Copy"}
				</button>
			</div>
			<Highlight theme={themes.vsDark} code={children.trim()} language="tsx">
				{({ tokens, getLineProps, getTokenProps }) => (
					<pre className="overflow-x-auto rounded-lg bg-[#1E1E1E] p-6 text-[13px]">
						{tokens.map((line, i) => (
							<div key={i} {...getLineProps({ line })} className="table-row">
								<span className="table-cell select-none pr-6 text-right text-[#858585] opacity-50">
									{i + 1}
								</span>
								<span className="table-cell">
									{line.map((token, key) => (
										<span key={key} {...getTokenProps({ token })} />
									))}
								</span>
							</div>
						))}
					</pre>
				)}
			</Highlight>
		</div>
	);
};

export default CodeBlock;
