# lite-cdn

A lite webserver to transform JPEG, PNG, WebP, GIF, AVIF, TIFF and SVG images into WebP images and save them locally. We can access to these images later like a CDN.

## Installation

```bash
nvm use
pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Using

You can use Docker image available on [Docker Hub](https://hub.docker.com/repository/docker/adrienguesnel/lite-cdn) to use this service.

## Contributing

Pull requests are welcome.
Please open an issue first to discuss what you would like to change.

## License

Lite cdn is [MIT licensed](LICENSE).
