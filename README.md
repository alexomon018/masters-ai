# Next.js Starter

This Next.js Starter project is designed to provide a solid foundation for building modern web applications with a focus on best practices, scalability, and maintainability. It includes a pre-configured setup with Storybook, ShadCN (for design using Tailwind CSS), Atomic Design principles, ESLint, Jest for testing, and Prettier for code formatting and Chromatic for visual testing.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Project Structure](#project-structure)
- [Usage](#usage)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/alexomon018/nextjs-starter.git
   cd nextjs-starter
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   # or
   yarn install
   ```

3. **Run the development server:**

   ```bash
   pnpm run dev
   # or
   yarn dev
   ```

4. **Open your browser:**

   Navigate to [http://localhost:3000](http://localhost:3000) to see your app in action.

## Features

- **Next.js**: A powerful React framework for server-side rendering, static site generation, and more.
- **Storybook**: A tool for building and testing UI components in isolation.
- **ShadCN (Tailwind CSS)**: A component library built with Tailwind CSS, enabling rapid UI development.
- **Atomic Design**: A design methodology that divides UI components into atoms, molecules, organisms, templates, and pages.
- **ESLint**: A tool for identifying and fixing problems in your JavaScript/TypeScript code.
- **Jest**: A delightful JavaScript testing framework with a focus on simplicity.
- **Prettier**: An opinionated code formatter that ensures consistent style across your codebase.

## Project Structure

This project follows a modular and scalable folder structure based on Atomic Design principles:

```
├── src
│   ├── components  // Atomic components (atoms, molecules, organisms)
│   │   ├── atoms
│   │   ├── molecules
│   │   └── organisms
│   ├── pages       // Next.js pages
│   ├── styles      // Global styles and Tailwind CSS configuration
│   ├── hooks       // Custom React hooks
│   ├── utils       // Utility functions and helpers
│   ├── tests       // Unit and integration tests
├── .storybook      // Storybook configuration files
├── .eslintrc       // ESLint configuration
├── jest.config.js  // Jest configuration
├── tailwind.config.js // Tailwind CSS configuration
├── prettier.config.js // Prettier configuration
└── package.json    // Project dependencies and scripts
```

## Branch Name Conventions

### Bug Fixes

If you are working on a bug ticket, name your branch:

```
bugfix/B{TICKET_ID}-{SHORT_TICKET_NAME}
```

### Feature Development

If you are working on a feature ticket, name your branch:

```
features/U{TICKET_ID}-{SHORT_TICKET_NAME}
```

---

## Usage

### Storybook

To start Storybook and develop components in isolation:

```bash
pnpm run storybook
# or
yarn storybook
```

Storybook will run on [http://localhost:6006](http://localhost:6006).

### Linting

To lint your code using ESLint:

```bash
npm run lint
# or
yarn lint
```

### Testing

To run tests using Jest:

```bash
pnpm run test
# or
yarn test
```

### Formatting

To format your code using Prettier:

```bash
pnpm run format
# or
yarn format
```

## Scripts

Here are the main scripts available in this project:

- `dev`: Starts the Next.js development server.
- `build`: Builds the Next.js application for production.
- `start`: Starts the production server.
- `lint`: Lints the codebase using ESLint.
- `test`: Runs tests using Jest.
- `format`: Formats the codebase using Prettier.
- `storybook`: Starts the Storybook server.
- `build-storybook`: Builds the Storybook for production.

## Configuration

### ESLint

The ESLint configuration is located in `.eslintrc`. It is pre-configured with recommended rules and plugins for Next.js, React, and Tailwind CSS.

### Prettier

The Prettier configuration is located in `prettier.config.js`. It enforces consistent formatting rules across your codebase.

### Jest

The Jest configuration is located in `jest.config.js`. It includes setup for testing React components and utility functions.

### Tailwind CSS

The Tailwind CSS configuration is located in `tailwind.config.js`. Customize it as needed to fit your design requirements.

## Contributing

Contributions are welcome! If you find any bugs or want to add new features, please feel free to open an issue or submit a pull request.

---

Happy coding! 🚀

---

Feel free to customize this README to better fit your project's needs.
