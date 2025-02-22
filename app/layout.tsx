import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@utils";
import { ThemeProvider } from "@/providers/themeProvider";

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans"
});

export const metadata: Metadata = {
	title: "Masters AI",
	description:
		"Masters AI is an AI-powered chatbot that helps you learn and grow. Gives you access to a wide range of resources and tools to help you achieve your goals."
};

const RootLayout = ({
	children
}: Readonly<{
	children: React.ReactNode;
}>) => (
	<html lang="en">
		<body
			className={cn(
				"min-h-screen bg-background font-sans antialiased",
				fontSans.variable
			)}
		>
			<div className="flex h-screen flex-col">
				<main className="flex-1">{children}</main>
			</div>
		</body>
	</html>
);

export default RootLayout;
