import { Button } from "@atoms";
import React from "react";

const Header = () => (
	<header className="flex items-center justify-between p-4 lg:px-8">
		<div className="text-xl font-bold">Masters AI</div>
		<div className="flex items-center gap-4">
			<Button variant="ghost">Learn more</Button>
			<Button>Join Masters AI</Button>
		</div>
	</header>
);

export default Header;
