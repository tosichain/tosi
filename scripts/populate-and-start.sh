#!/bin/sh

## Wait for IPFS
while true; do
   ipfs --api /dns4/$IPFS_HTTP_API_HOST/tcp/5001 id
   if [ $? = 0 ]; then
      break
   fi
   sleep 1
done

# Make assets available through IPFS
ipfs --api /dns4/$IPFS_HTTP_API_HOST/tcp/5001 add -r --cid-version=1 /data/ipfs-populate

# Get BLS key from keyserver
APP_SECRET=$(curl -s "http://${KEY_SERVER_HOST}:4000/get-key-info?id=node&type=BLS" | jq -r .info.secret)
# Get Wallet key from keyserver
WALLET_SECRET=$(curl -s "http://${KEY_SERVER_HOST}:4000/get-key-info?id=wallet&type=secp256k1" | jq -r .info.privateKey)
# Get Descartes key from keyserver
DESCARTES_SECRET=$(curl -s "http://${KEY_SERVER_HOST}:4000/get-key-info?id=descartes&type=secp256k1" | jq -r .info.privateKey)
export APP_SECRET WALLET_SECRET DESCARTES_SECRET
exec $@
