import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CtaSection, FaqSection } from "@molecules";
import {
	Footer,
	Header,
	AskSection,
	ExpertsSection,
	DiveInQuestions,
	InsightfulClips
} from "@organisms";

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
	<div className="min-h-screen bg-[#F8FAFF]">
		<Header />
		<main className="container mx-auto px-4 py-12 lg:px-8">
			<AskSection />
			<ExpertsSection />
			<DiveInQuestions />
			<InsightfulClips />
			<FaqSection />
			<CtaSection />
		</main>
		<Footer />
	</div>
);
export default Home;
