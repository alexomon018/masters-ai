import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
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
			"**/*.test.js"
		]
	},
	...fixupConfigRules(
		compat.extends(
			"next/core-web-vitals",
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
			"@typescript-eslint": fixupPluginRules(typescriptEslint)
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
			"linebreak-style": "off"
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
