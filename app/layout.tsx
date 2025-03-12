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

export const metadata: Metadata = {
	title: "FE Masters Chat",
	description:
		"FE Masters Chat is an AI-powered chatbot that helps you learn and grow. Gives you access to a wide range of resources and tools to help you achieve your goals."
};

const RootLayout = ({
	children
}: Readonly<{
	children: React.ReactNode;
}>) => (
	<ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
		<html lang="en" suppressHydrationWarning>
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
						<div className="flex flex-col h-screen">
							<main className="flex-1">{children}</main>
						</div>
					</ModelStoreProvider>
				</ThemeProvider>
			</body>
		</html>
	</ClerkProvider>
);

export default RootLayout;
