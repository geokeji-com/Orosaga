ARG FOUNDATION_IMAGE=python:3.10-slim
FROM ${FOUNDATION_IMAGE}

COPY rootfs/ /usr/local/
COPY npm.tgz /tmp/npm.tgz
RUN npm install --global --ignore-scripts --no-audit --no-fund /tmp/npm.tgz \
    && rm -f /tmp/npm.tgz \
    && groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/sh --create-home node \
    && node --version \
    && npm --version

CMD ["node"]
