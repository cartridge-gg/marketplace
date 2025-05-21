# Marketplace

#### Requirements

- [Install scarb](https://docs.swmansion.com/scarb/)
- [Install dojo](https://book.dojoengine.org/)
- [Install pnpm](https://pnpm.io/installation)
- [Install biome](https://biomejs.dev/guides/getting-started/)
- [Install docker](https://docs.docker.com/engine/install/)

## Installation

```bash
pnpm install
pnpm build
```

Start docker stack

```bash
docker compose up # for attached tty
docker compose up -d # if you want it to run as a daemon
```

Start services

```bash
pnpm dev
```
