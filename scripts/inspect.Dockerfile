# The design skill's inspector needs a browser. The build user's host has none, so it runs here.
FROM node:22-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && printf '#!/bin/sh\nexec /usr/bin/chromium --no-sandbox --disable-dev-shm-usage "$@"\n' > /usr/local/bin/chrome-wrap \
  && chmod 755 /usr/local/bin/chrome-wrap
ENV CHROME_PATH=/usr/local/bin/chrome-wrap
