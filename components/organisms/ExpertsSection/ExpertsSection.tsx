import { ExpertCard } from "@molecules";
import React from "react";

const experts = [
	{
		name: "Scott Moss",
		title: "CEO and Co-founder of Superfilter AI.",
		description:
			"Scott is the CEO and Co-founder of Superfilter AI. He’s spent years as a VC investing in AI startups, building new features as an engineer at Netflix, and founding and leading a devtools startup. He’s a 2-time YC founder that loves building things people obsess about. Outside of the grind, Scott loves to game and play basketball and spend time with his family out in California.",
		image:
			"https://static.frontendmasters.com/assets/teachers/moss/thumb@2x.webp"
	},
	{
		name: "Steve Kinney",
		title: "Temporal",
		description:
			"Steve is the front-end architect at Temporal. Previously, he was the front-end architect at Twilio and SendGrid. He is the director emeritus and founder of the front-end engineering program at the Turing School for Software and Design in Denver, Colorado — a non-profit developer training program. In a previous life, Steve was a New York City public school teacher. He taught special education and web development in Manhattan, Brooklyn, and Queens. He currently lives in Denver, Colorado",
		image:
			"https://static.frontendmasters.com/assets/teachers/kinney/thumb@2x.webp"
	},
	{
		name: "Brian Holt",
		title: "Neon",
		description:
			"Brian Holt currently serves as a staff product manager at Neon, bringing his robust experience in JavaScript engineering to the product. With a rich background that includes being a JavaScript engineer and PM at tech giants like Netflix, Stripe, Snowflake, LinkedIn, Microsoft, and Reddit, Brian has a keen eye for developer experience and cloud services. Beyond the office, Brian is probably drinking coffee or beer, playing Dota 2 poorly, snowboarding anywhere he can, and playing with his son and dog in Sacramento.",
		image:
			"https://static.frontendmasters.com/assets/teachers/holt/thumb@2x.webp"
	},
	{
		name: "Maximiliano Firtman",
		title: "Independent Consultant",
		description:
			"Max Firtman works as an independent free-lance consultant. He is a mobile + web developer, trainer, speaker, and writer. He has authored many books, including Programming the Mobile Web and High Performance Mobile Web published by O’Reilly Media. He is a frequent speaker at conferences worldwide and he has been widely recognized for his work in the mobile-web community. He teaches mobile (Android & iOS), HTML5, PWA and web performance trainings. He has been working in the Web since 1996 and in the mobile app space since 2001.",
		image:
			"https://static.frontendmasters.com/assets/teachers/firtman/thumb@2x.webp"
	},
	{
		name: "Erik Reinert",
		title: "TheAltF4Stream",
		description:
			"Erik Reinert is a Senior Software Engineer with over a decade of experience in several fields of software development. Starting in frontend before backend and fullstack then moving focus to organizational problem solving in DevOps & Infrastructure. With the passion of finding the best solution for any problem through collaboration and documentation.",
		image:
			"https://static.frontendmasters.com/assets/teachers/reinert/thumb.webp"
	},
	{
		name: "Jen Kramer",
		title: "AnnieCannons",
		description:
			"Jen Kramer has taught HTML and CSS to all skill levels for over 20 years. She was previously a Lecturer at Harvard University, in addition to her freelance web design work. She is also the author of over 70 video training courses and three books. Currently, Jen is the Director of Learning Design & Technology at AnnieCannons, a non-profit devoted to training, preparing, and connecting individuals who have experienced human trafficking to sustainable careers in tech.",
		image:
			"https://static.frontendmasters.com/assets/teachers/kramer/thumb.webp"
	}
];

const ExpertsSection = () => (
	<section className="mb-16">
		<h2 className="mb-2 text-2xl font-bold">
			Your personal AMA
			<br />
			with trusted experts
		</h2>
		<h3 className="mb-6 text-xl font-semibold">Popular on Masters AI</h3>
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{experts.map((expert) => (
				<ExpertCard key={expert.name} {...expert} />
			))}
		</div>
	</section>
);

export default ExpertsSection;
