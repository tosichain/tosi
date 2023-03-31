#! /bin/sh

export IPFS_PATH="/var/ipfs"
export IPFS_API="/ip4/127.0.0.1/tcp/5001"
export TIMEOUT="15s"

TASK_DIR="/opt/verifier"

INPUT_IMAGE="${TASK_DIR}/input.bin"
INPUT_SIZE=128

echo "Generating output file..."
dd if=/dev/zero of="$INPUT_IMAGE" bs=1 count=0 seek="$INPUT_SIZE"

ipfs init --profile=server --empty-repo
ipfs daemon --offline &

## Wait for IPFS daemon to come online.
sleep 4

mkdir -p empty

FUNCTION_CID=$(ipfs add --api $IPFS_API --cid-version=1 -Q "$TASK_DIR/function.squashfs")
echo "FUNCTION: $FUNCTION_CID"
PREV_OUTPUT_CID=$(ipfs add --api $IPFS_API -r --cid-version=1 -Q empty)
INPUT_CID=$(ipfs add --api $IPFS_API --cid-version=1 -Q "$INPUT_IMAGE")

echo "INPUT: $INPUT_CID"

IPFS_API="/ip4/127.0.0.1/tcp/5001" ./qemu-run-task.sh $PREV_OUTPUT_CID $INPUT_CID $FUNCTION_CID
