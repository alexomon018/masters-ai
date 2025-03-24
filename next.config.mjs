/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				hostname: "static.frontendmasters.com"
			}
		]
	},
	async headers() {
		return [
			{
				// matching all API routes
				source: "/api/:path*",
				headers: [
					{ key: "Access-Control-Allow-Credentials", value: "true" },
					{ key: "Access-Control-Allow-Origin", value: "*" },
					{
						key: "Access-Control-Allow-Methods",
						value: "GET,OPTIONS,PATCH,DELETE,POST,PUT"
					},
					{
						key: "Access-Control-Allow-Headers",
						value:
							"X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubdomains; preload"
					},
					{
						key: "Content-Security-Policy",
						value:
							"default-src 'self'; img-src 'self' static.frontendmasters.com; script-src 'self'; style-src 'self'; object-src 'none'"
					},
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "same-origin" }
				]
			}
		];
	},
	webpack: (config, { webpack, isServer, nextRuntime }) => {
		// Grab the existing rule that handles SVG imports
		const fileLoaderRule = config.module.rules
			.find((rule) => rule.oneOf)
			.oneOf.find((rule) => rule.test?.test?.(".svg"));

		config.module.rules.push({
			test: /\.svg$/,
			use: [
				{
					loader: "@svgr/webpack",
					options: {
						icon: true,
						replaceAttrValues: { "#333": "{props.fill}" },
						svgoConfig: {
							plugins: [
								{
									name: "preset-default",
									params: {
										overrides: {
											removeViewBox: false
										}
									}
								}
							]
						}
					}
				}
			]
		});

		// Modify the file loader to ignore svg files
		if (fileLoaderRule) {
			fileLoaderRule.exclude = /\.svg$/i;
		}

		return config;
	},
	// Increase the default timeout for API routes
	serverRuntimeConfig: {
		apiTimeout: 60000 // 60 seconds
	},
	experimental: {
		proxyTimeout: 150000
	}
};

export default nextConfig;
