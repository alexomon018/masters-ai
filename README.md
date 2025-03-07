# Masters AI - Next.js AI Chat Application

This project is an AI-powered chat application built with Next.js, featuring a modern UI with Tailwind CSS and ShadCN components. It implements a conversational AI interface with memory, RAG (Retrieval-Augmented Generation), and agent capabilities.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Environment Variables](#environment-variables)
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
   git clone https://github.com/yourusername/masters-ai.git
   cd masters-ai
   ```

2. **Install dependencies:**

   ```bash
   yarn install
   ```

3. **Set up environment variables:**

   Copy the `.env.example` file to `.env` and fill in the required values:

   ```bash
   cp .env.example .env
   ```

4. **Run the development server:**

   ```bash
   yarn dev
   ```

5. **Open your browser:**

   Navigate to [http://localhost:3000](http://localhost:3000) to see your app in action.

## Features

- **AI Chat Interface**: Conversational UI with streaming responses
- **Memory System**: Persistent chat history and context management
- **RAG (Retrieval-Augmented Generation)**: Enhanced responses with relevant information retrieval
- **Agent Capabilities**: AI tools and actions for enhanced functionality
- **Authentication**: User authentication via Clerk
- **Database**: Drizzle ORM with Neon Database (PostgreSQL)
- **Vector Storage**: Upstash Vector for embedding storage and retrieval
- **Rate Limiting**: Upstash Rate Limit for API protection
- **Modern UI**: Built with Tailwind CSS, ShadCN, and Radix UI components
- **Atomic Design**: Component structure following Atomic Design principles
- **Storybook**: Component development and documentation
- **Testing**: Jest for unit and integration testing
- **TypeScript**: Type-safe code throughout the application

## Environment Variables

This application requires several environment variables to function properly. Create a `.env` file in the root directory with the following variables:

```
# Base URL for the application
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Upstash Redis for rate limiting and caching
# Get these from https://console.upstash.com/
UPSTASH_REDIS_REST_URL="your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"

# Upstash Vector for embedding storage and retrieval
# Get these from https://console.upstash.com/vector
UPSTASH_VECTOR_REST_URL="your-upstash-vector-url"
UPSTASH_VECTOR_REST_TOKEN="your-upstash-vector-token"

# PostgreSQL database URL (Neon)
POSTGRES_URL="your-postgres-connection-string"

# OpenAI API key for AI functionality
# Get this from https://platform.openai.com/api-keys
OPENAI_API_KEY="your-openai-api-key"

# Clerk authentication keys
# Get these from your Clerk dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL="http://localhost:3000/chat"
```

> **Important**: Never commit your `.env` file to version control. The repository includes a `.env.example` file that you can use as a template.

## Project Structure

This project follows a modular and scalable folder structure based on Atomic Design principles:

```
├── app/             # Next.js app router pages and API routes
├── components/      # UI components organized by Atomic Design
│   ├── atoms/       # Basic building blocks (buttons, inputs, etc.)
│   ├── molecules/   # Combinations of atoms (form fields, cards, etc.)
│   └── organisms/   # Complex UI sections (chat interface, sidebar, etc.)
├── ai/              # AI-related functionality
│   ├── tools/       # AI agent tools
│   ├── agent.ts     # Agent implementation
│   ├── llm.ts       # Language model configuration
│   ├── memory.ts    # Memory and context management
│   └── rag.ts       # Retrieval-augmented generation
├── lib/             # Utility libraries and shared code
├── providers/       # React context providers
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── public/          # Static assets
└── localdb/         # Local database implementation
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
yarn storybook
```

Storybook will run on [http://localhost:6006](http://localhost:6006).

### Database Management

To generate database migrations:

```bash
yarn db:generate
```

To run the Drizzle Studio for database management:

```bash
yarn db:studio
```

### Linting

To lint your code using ESLint:

```bash
yarn lint
```

### Testing

To run tests using Jest:

```bash
yarn test
```

## Scripts

Here are the main scripts available in this project:

- `dev`: Starts the Next.js development server
- `build`: Builds the Next.js application for production
- `start`: Starts the production server
- `lint`: Lints the codebase using ESLint
- `test`: Runs tests using Jest
- `tsc`: Runs TypeScript compiler
- `storybook`: Starts the Storybook server
- `build-storybook`: Builds the Storybook for production
- `chromatic`: Runs Chromatic for visual testing
- `db:generate`: Generates Drizzle migrations
- `db:studio`: Starts Drizzle Studio for database management
- `db:migrate`: Runs database migrations
- `prepare`: Installs Husky hooks

## Configuration

### Environment Variables

The application requires several environment variables to be set. Check the `.env.example` file for the required variables.

### ESLint

The ESLint configuration is located in `.eslintrc.json` and `eslint.config.mjs`. It is pre-configured with recommended rules and plugins for Next.js, React, and Tailwind CSS.

### Tailwind CSS

The Tailwind CSS configuration is located in `tailwind.config.ts`. It includes custom theme settings and plugins.

### TypeScript

The TypeScript configuration is located in `tsconfig.json`. It includes settings for Next.js and React.

## Contributing

Contributions are welcome! If you find any bugs or want to add new features, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

---

Happy coding! 🚀
