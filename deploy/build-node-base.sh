#!/usr/bin/env sh
set -eu

NODE_VERSION=24.17.0
NODE_SHA256=ab343a1b747c7cbf3630dfd7dbf818c5423fab2eb4f5ad1afc896f6bd121a917
NPM_VERSION=11.6.2
NPM_SHA1=2af8ff1f23b279df1e5289db7c70cfedd0fe18c5
NODE_ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.xz"
NODE_URL="https://mirrors.huaweicloud.com/nodejs/v${NODE_VERSION}/${NODE_ARCHIVE}"
NPM_URL="https://registry.npmjs.org/npm/-/npm-${NPM_VERSION}.tgz"
NODE_BASE_TAG="${OROSAGA_NODE_BASE_TAG:-orosaga-node:${NODE_VERSION}}"
NODE_FOUNDATION_IMAGE="${OROSAGA_NODE_FOUNDATION_IMAGE:-python:3.10-slim}"
NODE_BUILD_DIR="$(mktemp -d /tmp/orosaga-node-base.XXXXXX)"
trap 'rm -rf "${NODE_BUILD_DIR}"' EXIT

mkdir -p "${NODE_BUILD_DIR}/rootfs"
curl --fail --location --silent --show-error \
  "${NODE_URL}" --output "${NODE_BUILD_DIR}/${NODE_ARCHIVE}"
printf '%s  %s\n' "${NODE_SHA256}" "${NODE_BUILD_DIR}/${NODE_ARCHIVE}" \
  | sha256sum --check --status
tar -xJf "${NODE_BUILD_DIR}/${NODE_ARCHIVE}" \
  --strip-components=1 -C "${NODE_BUILD_DIR}/rootfs"
curl --fail --location --silent --show-error \
  "${NPM_URL}" --output "${NODE_BUILD_DIR}/npm.tgz"
printf '%s  %s\n' "${NPM_SHA1}" "${NODE_BUILD_DIR}/npm.tgz" \
  | sha1sum --check --status
docker build \
  --build-arg "FOUNDATION_IMAGE=${NODE_FOUNDATION_IMAGE}" \
  --file deploy/docker/NodeBase.Dockerfile \
  --tag "${NODE_BASE_TAG}" \
  "${NODE_BUILD_DIR}"
docker run --rm "${NODE_BASE_TAG}" node --version
docker run --rm "${NODE_BASE_TAG}" npm --version
