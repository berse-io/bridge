Berse
=====

[Berse](https://berse.io) is a bridging platform between Ethereum blockchains.

This repository is a monorepo including the Berse protocol smart contracts and numerous developer tools.

[![Activity](https://img.shields.io/github/last-commit/berse-io/monorepo.svg)](https://github.com/berse-io)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Usage

Node version >= 6.12 is required.

### Demo

This document is a work-in-progress, and will be updated in the coming week.

```bash
yarn
cd packages/

cd contracts/
yarn build

cd multichain/
yarn start run --chain ethereum --name kovan
yarn start run --chain ethereum --name rinkeby

cd deployer/
NODE_ENV=development yarn deploy:testnets

cd relayer/
NODE_ENV=development yarn start

cd bridge-ui/
NODE_ENV=development yarn dev
```

## Contributing

We strongly recommend that the community help us make improvements and determine the future direction of the protocol. To report bugs within this package, please create an issue in this repository.

### Install dependencies

Make sure you are using Yarn v1.9.4. To install using brew:

```bash
brew install yarn@1.9.4
```

Then install dependencies

```bash
yarn install
```

### Build

To build all packages:

```bash
yarn build
```

To build a specific package:

### Watch

To re-build all packages on change:

```bash
yarn watch
```