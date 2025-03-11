"use client";

import React from "react";
import { makeDecorator } from "@storybook/addons";
import type { ReactElement } from "react";
import { ThemeProvider } from "./themeProvider";
import { ModelStoreProvider } from "./modelStoreProvider";

const withThemeProvider = makeDecorator({
	name: "withHeaderThemeProvider",
	parameterName: "Th",
	wrapper: (storyFunction, context) => (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			{storyFunction(context) as ReactElement}
		</ThemeProvider>
	)
});

const withModelStoreProvider = makeDecorator({
	name: "withModelStoreProvider",
	parameterName: "ModelStore",
	wrapper: (storyFunction, context) => (
		<ModelStoreProvider>
			{storyFunction(context) as ReactElement}
		</ModelStoreProvider>
	)
});

export { withThemeProvider, withModelStoreProvider };
