# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `pnpm dev` - Starts all development servers in parallel for both client and contracts
- `pnpm build` - Builds all packages and dependencies including smart contracts
- `pnpm build:scarb` - Builds only the Cairo smart contracts using Scarb

### Testing

- `pnpm test` - Runs the complete test suite across all packages
- `pnpm test:watch` - Runs tests in watch mode for continuous development

### Code Quality

- `pnpm lint` - Runs linting across all packages
- `pnpm lint:check` - Checks linting without fixing
- `pnpm format` - Formats code using Biome
- `pnpm format:check` - Checks formatting without applying changes
- `pnpm type:check` - Runs TypeScript type checking

### Package Management

- `pnpm install` - Install dependencies
- `corepack enable pnpm` - Enable pnpm via corepack

## Architecture Overview

### Project Structure

This is a **monorepo** using **pnpm workspaces** and **Turbo** for build orchestration. The project implements a decentralized marketplace for trading game assets and NFTs on StarkNet using the Dojo framework.

### Core Components

**Frontend Application (`/client/`)**
- **Technology**: React + TypeScript + Vite
- **Purpose**: Web interface for browsing, buying, and selling game assets
- **Key Features**: Asset discovery, trading interface, wallet integration

**Smart Contracts (`/contracts/`)**
- **Technology**: Cairo + Dojo framework
- **Purpose**: Decentralized marketplace logic and asset management
- **Key Features**: Asset tokenization, trading mechanics, ownership verification

**Shared Packages (`/packages/`)**
- Supporting libraries and utilities shared between client and contracts

### Technology Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Smart Contracts**: Cairo, Dojo, Scarb
- **Blockchain**: StarkNet
- **Testing**: Jest, Vitest
- **Build**: Turbo, pnpm workspaces
- **Code Quality**: Biome (linting & formatting), ESLint

### Dojo Integration

The project leverages **Dojo** as the game engine framework for StarkNet:

- **World Contract**: Central registry for all game entities and systems
- **Systems**: Game logic contracts that modify world state
- **Components**: Data structures representing game state
- **Client SDK**: JavaScript bindings for interacting with Dojo world

### Development Workflow

1. **Local Development**: Use `pnpm dev` to start both frontend and contract development servers
2. **Smart Contract Development**: Contracts in `/contracts/` are built with Scarb and deployed using Dojo
3. **Client Development**: Frontend in `/client/` connects to deployed contracts for testing
4. **Integration Testing**: Full-stack testing with deployed contracts on local Katana node

### Key Integration Points

- **Dojo SDK**: JavaScript bindings for contract interaction
- **Wallet Integration**: StarkNet wallet connectivity for transactions
- **Asset Metadata**: IPFS integration for storing asset metadata
- **Real-time Updates**: Subscription to blockchain events for live marketplace data

### Configuration Files

- **`Scarb.toml`** - Cairo project configuration and dependencies
- **`dojo_dev.toml`** / **`dojo_mainnet.toml`** - Dojo world configuration for different environments
- **`turbo.json`** - Build pipeline configuration
- **`compose.yaml`** - Docker composition for local development environment

## Claude Code Workflow Guidelines

### Code Quality Requirements

- **Always run linting/formatting** before committing: `pnpm lint` and `pnpm format`
- **TypeScript compliance** - All TypeScript errors must be resolved: `pnpm type:check`
- **Smart contract validation** - Ensure Cairo contracts build successfully: `pnpm build:scarb`
- **Test coverage** - Run relevant tests after making changes: `pnpm test`

### Common Development Tasks

**Working with Smart Contracts:**
- Modify contracts in `contracts/src/`
- Test contract builds with `pnpm build:scarb`
- Update Dojo configuration in `dojo_*.toml` files as needed
- Verify contract deployment and integration

**Working with Frontend:**
- Components and UI logic in `client/src/`
- Update Dojo SDK integration for new contract features
- Test wallet connectivity and transaction flows
- Ensure responsive design and accessibility

**Full-Stack Integration:**
- Test contract-frontend interaction flows
- Verify event subscriptions and real-time updates
- Validate asset metadata handling
- Test marketplace transaction workflows

### Debugging Integration Issues

- **Contract Debugging**: Use Scarb test framework and Cairo debugging tools
- **Frontend Debugging**: Browser dev tools with StarkNet wallet integration
- **Dojo Integration**: Check world state and entity synchronization
- **Transaction Issues**: Verify contract calls and event emissions

### Testing Strategy

- **Unit Tests**: Individual component and contract testing
- **Integration Tests**: Frontend-contract interaction testing
- **E2E Testing**: Complete user workflow validation
- **Performance Testing**: Transaction throughput and UI responsiveness

### Key Files to Check When Making Changes

- `contracts/src/lib.cairo` - Main contract exports and world setup
- `client/src/main.tsx` - Frontend application entry point
- `client/src/constants.ts` - Configuration and contract addresses
- `turbo.json` - Build dependencies and task configuration
- `pnpm-workspace.yaml` - Package workspace configuration
- `Scarb.toml` - Smart contract dependencies and build settings

### Marketplace-Specific Considerations

- **Asset Standards**: Follow ERC-721/ERC-1155 patterns for game assets
- **Trading Logic**: Ensure secure and fair trading mechanisms
- **Fee Structures**: Implement transparent fee calculations
- **User Experience**: Prioritize intuitive asset discovery and trading flows
- **Security**: Validate all user inputs and contract interactions
- **Performance**: Optimize for fast asset loading and smooth trading experience