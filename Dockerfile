# All images run as a non-root user. There are no runtime npm dependencies: Node 22 strips the types.
FROM node:22-slim AS base
WORKDIR /app
RUN mkdir -p /state/reader /state/courier /state/treasury /state/runner /out \
  && chown -R node:node /state /out
COPY package.json ./
COPY src ./src

FROM base AS agents
COPY fixtures/desk ./fixtures/desk
COPY fixtures/invoices ./fixtures/invoices
COPY switch ./switch
USER node

# No vendor master and no model in this image.
FROM base AS reader
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
COPY fixtures/desk/purchase-orders.json fixtures/desk/goods-receipts.json ./fixtures/desk/
COPY fixtures/extractions ./fixtures/extractions
USER node

# Only demo.sh up --model builds this one.
FROM reader AS reader-model
USER root
RUN npm install -g @anthropic-ai/claude-code@2.1.318
USER node
