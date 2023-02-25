#! /bin/sh

export IPFS_PATH="/var/ipfs"
export IPFS_API="/ip4/127.0.0.1/tcp/5001"
export TIMEOUT="15s"

TASK_DIR="/opt/verifier"

SCRATCH_IMAGE="${TASK_DIR}/scratch.ext2"
SCRATCH_SIZE=4G

INPUT_IMAGE="${TASK_DIR}/input.bin"
INPUT_SIZE=128

echo "Generating output file..."
dd if=/dev/zero of="$INPUT_IMAGE" bs=1 count=0 seek="$INPUT_SIZE"

echo "Generating blank scratch file..."
dd if=/dev/zero of="$SCRATCH_IMAGE" bs=1 count=0 seek="$SCRATCH_SIZE"

ipfs init --profile=server --empty-repo
ipfs daemon --offline &

## Wait for IPFS daemon to come online.
sleep 4

APP_CID=$(ipfs add --api $IPFS_API --cid-version=1 -Q "$TASK_DIR/app.squashfs")
echo "APP: $APP_CID"
COURT_CID=$(ipfs add --api $IPFS_API --cid-version=1 -Q "$TASK_DIR/court.squashfs")
echo "COURT: $COURT_CID"
STATE_CID=$(ipfs add --api $IPFS_API --cid-version=1 -Q "$TASK_DIR/empty.squashfs")
echo "STATE: $STATE_CID"
INPUT_CID=$(ipfs add --api $IPFS_API --cid-version=1 -Q "$INPUT_IMAGE")
echo "INPUT: $INPUT_CID"

PRE_RAW=$(printf '{"state.squashfs":{"/":"%s"},"app.img":{"/":"%s"},"court.img":{"/":"%s"},"input":{"/":"%s"}}' $STATE_CID $APP_CID $COURT_CID $INPUT_CID)
echo $PRE_RAW

PRE_CID=$(echo $PRE_RAW | ipfs dag put)
echo $PRE_CID

IPFS_API="/ip4/127.0.0.1/tcp/5001" TIMEOUT="15s" ./qemu-run-task.sh "$PRE_CID"