import { SignInButton } from "@clerk/nextjs";
import GoogleIcon from "@/public/google.svg";
import { Button } from "@atoms";
import Image from "next/image";

const Page = () => (
	<div className="flex min-h-screen items-center justify-center bg-background">
		<div className="flex flex-col items-center gap-4">
			<h1 className="text-4xl font-bold text-foreground">
				Welcome to FE Masters Chat
			</h1>
			<p className="text-muted-foreground">
				{`Sign in below (we'll increase your message limits if you do 😉)`}
			</p>
			<SignInButton>
				<Button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
					<Image src={GoogleIcon} alt="Google logo" width={20} height={20} />
					Continue with Google
				</Button>
			</SignInButton>
		</div>
	</div>
);

export default Page;
