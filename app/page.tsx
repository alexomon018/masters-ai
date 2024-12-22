import { Button } from "@atoms";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const generateMetadata = async (): Promise<Metadata> => {
	const page = {
		seoMetadata: {
			seoTitle: "Alexomons018",
			seoDescription: "Welcome to alexomons018 template.",
			seoKeywords: ["Alexomons018", "Template"],
			noIndex: false,
			noFollow: false
		}
	};

	// check if page exists and if it belongs to the correct city
	if (!page) {
		notFound();
	}

	const seo = page.seoMetadata;

	return {
		title: seo?.seoTitle,
		description: seo?.seoDescription,
		keywords: seo?.seoKeywords as string[],
		robots: {
			index: !seo?.noIndex,
			follow: !seo?.noFollow
		}
	};
};

const Home = () => (
	<main>
		Welcome to alexomons018 template.
		<Button className="bg-slate-800 text-white">Click</Button>
	</main>
);

export default Home;
