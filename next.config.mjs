/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				hostname: "static.frontendmasters.com"
			}
		]
	}
};

export default nextConfig;
