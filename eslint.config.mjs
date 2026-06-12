import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

export default [
	{
		ignores: [
			"**/*.stories.tsx",
			"**/*.stories.js",
			"**/*.test.tsx",
			"**/*.test.js",
			"src/routeTree.gen.ts"
		]
	},
	...fixupConfigRules(
		compat.extends(
			"eslint:recommended",
			"airbnb",
			"airbnb-typescript",
			"plugin:@typescript-eslint/recommended",
			"plugin:import/recommended",
			"plugin:import/typescript",
			"plugin:tailwindcss/recommended",
			"plugin:jsx-a11y/recommended",
			"prettier"
		)
	),
	{
		plugins: {
			"@typescript-eslint": fixupPluginRules(typescriptEslint),
			"react-hooks": fixupPluginRules(reactHooks)
		},

		// The TypeScript import resolver (tsconfig path aliases like @atoms,
		// @/*) used to come from next/core-web-vitals; configure it directly now
		// that Next is gone, so eslint-plugin-import can resolve them.
		settings: {
			"import/resolver": {
				typescript: { project: "./tsconfig.json" },
				node: true
			}
		},

		rules: {
			"import/prefer-default-export": "off",
			"react/require-default-props": "off",
			"@typescript-eslint/lines-between-class-members": "off",
			"@typescript-eslint/no-throw-literal": "off",
			"react/no-array-index-key": "off",
			"react/prop-types": "off",
			"tailwindcss/classnames-order": "off",
			"react/jsx-props-no-spreading": "off",
			"react/react-in-jsx-scope": "off",

			"react/function-component-definition": [
				"error",
				{
					namedComponents: "arrow-function",
					unnamedComponents: "arrow-function"
				}
			],

			"no-underscore-dangle": "off",
			"linebreak-style": "off",

			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn"
		}
	},
	{
		files: ["**/*.ts", "**/*.tsx"],

		languageOptions: {
			ecmaVersion: 5,
			sourceType: "script",

			parserOptions: {
				project: ["./tsconfig.json"]
			}
		}
	},
	{
		files: ["src/**/*.stories.ts?(x)"],

		rules: {
			"import/no-extraneous-dependencies": "off"
		}
	}
];
