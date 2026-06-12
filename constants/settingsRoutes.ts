// `tab` is the value for the TanStack `/settings/$tab` route param; `href` is
// the full path kept for active-state comparison against the current location.
const SETTINGS_TABS = [
	{ name: "Account", tab: "account", href: "/settings/account" },
	{ name: "Customization", tab: "customization", href: "/settings/customization" },
	{ name: "Models", tab: "models", href: "/settings/models" },
	{ name: "Attachments", tab: "attachments", href: "/settings/attachments" }
];

export { SETTINGS_TABS };
