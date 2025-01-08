import { Button } from "@atoms";
import { ArrowRight } from "lucide-react";

const CtaSection = () => (
	<div className="mb-16 text-center md:text-left">
		<h2 className="mb-2 text-2xl font-bold">Get smarter faster.</h2>
		<p className="mb-6 text-xl">Join Masters AI now.</p>
		<Button className="group">
			Join Masters AI
			<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
		</Button>
	</div>
);

export default CtaSection;
