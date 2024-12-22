import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "../Accordion";

const FaqSection = () => {
	const faqs = [
		{
			question: "What is Masters AI?",
			answer:
				"Masters AI is a platform that connects you with expert knowledge and insights from trusted professionals across various fields."
		},
		{
			question:
				"How is Masters AI different from other podcast apps or search engines?",
			answer:
				"Masters AI provides direct access to curated expert knowledge and allows you to interact with content in a more meaningful way than traditional podcast apps or search engines."
		},
		{
			question: "Can I find content from my favorite podcasters on Masters AI?",
			answer:
				"Yes, Masters AI features content from many popular podcasters and experts across different fields, with new content being added regularly."
		},
		{
			question: "Is Masters AI free to use?",
			answer:
				"Masters AI offers both free and premium features. You can access basic content for free, while premium features may require a subscription."
		}
	];

	return (
		<div className="mb-16 flex w-full flex-col items-center justify-center md:flex-row">
			<h2 className="flex-[0_1_50%] text-2xl font-bold">
				Frequently Asked Questions
			</h2>
			<Accordion type="single" collapsible className="w-full max-w-2xl">
				{faqs.map((faq, index) => (
					<AccordionItem key={index} value={`item-${index}`}>
						<AccordionTrigger className="text-left">
							{faq.question}
						</AccordionTrigger>
						<AccordionContent>{faq.answer}</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
};

export default FaqSection;
