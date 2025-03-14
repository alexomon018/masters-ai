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
							"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'"
					},
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "same-origin" },
					{ key: "Server", value: "Erlang on Eels" }
				]
			}
		];
	},
	webpack: (config, { webpack, isServer, nextRuntime }) => {
		config.module.rules.push({
			test: /\.svg$/,
			use: [
				{
					loader: "@svgr/webpack",
					options: {
						icon: true,
						replaceAttrValues: { "#333": "{props.fill}" }
					}
				}
			]
		});

		return config;
	}
};

export default nextConfig;
