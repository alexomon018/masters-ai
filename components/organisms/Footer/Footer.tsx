import Link from "next/link";

const Footer = () => (
	<footer className="border-t">
		<div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8">
			<div className="text-xl font-bold">Masters AI</div>
			<div className="flex items-center gap-4 text-sm text-muted-foreground">
				<span>© 2024 Masters AI</span>
				<Link href="/terms" className="transition-colors hover:text-foreground">
					Terms
				</Link>
				<Link
					href="/privacy"
					className="transition-colors hover:text-foreground"
				>
					Privacy
				</Link>
				<Link
					href="/support"
					className="transition-colors hover:text-foreground"
				>
					Support
				</Link>
			</div>
		</div>
	</footer>
);

export default Footer;
