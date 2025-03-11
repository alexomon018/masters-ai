import type { Preview } from "@storybook/react";
import "../app/globals.css";
import { withThemeProvider, withModelStoreProvider } from "../providers";
import React from "react";

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		nextjs: {
			appDirectory: true
		}
	},
	decorators: [
		withThemeProvider,
		withModelStoreProvider,
		(Story) => {
			return <Story />;
		}
	]
};

export default preview;
