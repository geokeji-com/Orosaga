ARG FOUNDATION_IMAGE=python:3.10-slim
FROM ${FOUNDATION_IMAGE}

COPY rootfs/ /usr/local/
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/sh --create-home node \
    && node --version \
    && npm --version

CMD ["node"]
