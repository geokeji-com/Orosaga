#!/usr/bin/env sh
set -eu

cat <<'EOF' | sha256sum --check --status
5a0dc132e14fe5df56951600112cc9c596a1e9ab4e0e2298fff7ca9649e88961  /etc/nginx/conf.d/publish-gateway-domain.conf
dde53658b456a1865dc22de36e6b0fe728e1c9838d2a8f2e5f4927780a94a661  /etc/nginx/ssl/publish.wanhuchangan.com/publish.wanhuchangan.com.pem
607184eb75517b7423cfcf01643dc8c43cd082d84a92a7479334110853cb0d60  /etc/nginx/ssl/publish.wanhuchangan.com/publish.wanhuchangan.com.key
EOF

echo "publish.wanhuchangan.com protected files are unchanged"
