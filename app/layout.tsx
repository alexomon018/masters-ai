import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";
import { ModelStoreProvider, ThemeProvider } from "@providers";
import { cn } from "@utils";

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans"
});

const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#1a1a1a";

export const metadata: Metadata = {
	metadataBase: new URL("https://femasters.chat"),
	title: "FE Masters Chat",
	description:
		"FE Masters Chat is an AI-powered chatbot that helps you learn and grow. Gives you access to a wide range of resources and tools to help you achieve your goals."
};

const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

const RootLayout = ({
	children
}: Readonly<{
	children: React.ReactNode;
}>) => (
	<ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: THEME_COLOR_SCRIPT
					}}
				/>
			</head>
			<body
				className={cn(
					"min-h-screen bg-background font-sans antialiased",
					fontSans.variable
				)}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<ModelStoreProvider>
						<Toaster />
						<div className="flex h-screen flex-col">
							<main className="flex-1">{children}</main>
						</div>
					</ModelStoreProvider>
				</ThemeProvider>
			</body>
		</html>
	</ClerkProvider>
);

export default RootLayout;
