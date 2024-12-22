import { QuestionCard } from "@molecules";
import React from "react";

const DiveInQuestions = () => (
	<section className="mb-16">
		<h2 className="mb-8 text-2xl font-bold">
			Dive into questions that
			<br />
			fuel insight and curiosity
		</h2>
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<QuestionCard question="What does this AI do?" askedBy={49} />
			<QuestionCard
				question="What studies support the use of methylene blue for longevity and reversing aging as discussed in the podcast?"
				askedBy={13}
			/>
			<QuestionCard
				question="Is the problem that we tie too much of our self-worth to something that, when lost, results in identity paralysis?"
				askedBy={10}
			/>
			<QuestionCard
				question="What scientific research supports the benefits of NAD?"
				askedBy={7}
			/>
			<QuestionCard
				question="What is microdosing psilocybin as explained in the episode Dr. Robin Carhart-Harris: The Science of Psychedelics?"
				askedBy={16}
			/>
			<QuestionCard
				question="What are the benefits of each sleep supplement—Magnesium Threonate, Apigenin, and Theanine—for falling asleep?"
				askedBy={6}
			/>
		</div>
	</section>
);

export default DiveInQuestions;
