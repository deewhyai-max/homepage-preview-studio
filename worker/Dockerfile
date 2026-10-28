# Build from the project root:  docker build -f worker/Dockerfile -t deewhy-recorder .
FROM mcr.microsoft.com/playwright:v1.56.1-noble

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-noto fonts-noto-cjk fonts-noto-color-emoji fonts-liberation tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY src/lib/recording.ts ./src/lib/recording.ts
COPY worker/package.json worker/package-lock.json* ./worker/
RUN cd worker && npm install --omit=dev --no-audit --no-fund && npm install tsx@4.20.6 --no-audit --no-fund
COPY worker/src ./worker/src

ENV NODE_ENV=production PORT=8080 WORK_DIR=/tmp
EXPOSE 8080
USER pwuser
WORKDIR /app/worker
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--import", "tsx", "src/main.ts"]
