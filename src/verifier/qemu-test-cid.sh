#! /bin/sh

export IPFS_PATH="/var/ipfs"
export IPFS_API="/ip4/127.0.0.1/tcp/5001"
export TIMEOUT="15s"

TASK_DIR="/opt/verifier"

ipfs init --profile=server --empty-repo
ipfs daemon --offline &

## Wait for IPFS daemon to come online.
sleep 4

/app/prepopulate.sh

mkdir -p empty


OUTPUT=$(IPFS_API="/ip4/127.0.0.1/tcp/5001" ./qemu-run-task.sh $1 $2 $3)

OUTPUT_CID=$(echo -n "${OUTPUT}" | jq -r .outputCID)
ipfs dag export $OUTPUT_CID > /data/ext-car/output-$OUTPUT_CID.car

echo -n $OUTPUT
