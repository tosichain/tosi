#! /bin/sh
# $1 = pre CID

# we should have this DA already, so no timeout
PRE_CID=$1
PRE_NONCE=$2
INPUT_CID=$3
GOV_CID=$4
BUILD_UPON=$5

TASK_DIR=$(mktemp -d /tmp/run-task.XXXXXX)

>&2 echo "TASK_DIR=${TASK_DIR}"

ipfs --api $IPFS_API get -o "$TASK_DIR/state.squashfs" $PRE_CID/state.squashfs &> /dev/null
ipfs --api $IPFS_API get -o "$TASK_DIR/app.img" $PRE_CID/gov/app.img &> /dev/null
ipfs --api $IPFS_API get -o "$TASK_DIR/court.img" $PRE_CID/gov/court.img &> /dev/null
ipfs --api $IPFS_API get -o "$TASK_DIR/input" $INPUT_CID &> /dev/null
dd if=/dev/zero of=$TASK_DIR/scratch.img bs=1 count=0 seek=4096M

VALIDATOR_ROOT="/opt/validator"
SCRATCH_IMAGE="${TASK_DIR}/scratch.img"
KERNEL="/app/bzImage"
APP_IMAGE="${TASK_DIR}/app.img"
COURT_IMAGE="${TASK_DIR}/court.img"

STATE_IMAGE="${TASK_DIR}/state.squashfs"

INPUT_IMAGE="${TASK_DIR}/input"
OUTPUT_IMAGE="${TASK_DIR}/output.bin"
OUTPUT_SIZE=32

dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1 count=0 seek="$OUTPUT_SIZE"

STATE_CID=$(ipfs --api $IPFS_API add --only-hash --cid-version=1 -Q $STATE_IMAGE)
COURT_CID=$(ipfs --api $IPFS_API add --only-hash --cid-version=1 -Q $COURT_IMAGE)
APP_CID=$(ipfs --api $IPFS_API add --only-hash --cid-version=1 -Q $APP_IMAGE)
INPUT_CID=$(ipfs --api $IPFS_API add --only-hash --cid-version=1 -Q $INPUT_IMAGE)

>&2 echo "STATE: ${STATE_CID}"
>&2 echo "COURT: ${COURT_CID}"
>&2 echo "APP: ${APP_CID}"
>&2 echo "INPUT: ${INPUT_CID}"
>&2 echo "NONCE: ${PRE_NONCE}"
GOV_CID=$(printf '{"court.img":{"/":"%s"},"app.img":{"/":"%s"}}' $COURT_CID $APP_CID | ipfs --api $IPFS_API dag put --input-codec dag-json --store-codec dag-cbor)
if [ x$BUILD_UPON == xfalse ]; then
  PRE_CID=$(printf '{"input":{"/":"%s"},"state.squashfs":{"/":"%s"},"nonce":"%s","gov":{"/":"%s"}}' $INPUT_CID $STATE_CID $PRE_NONCE $GOV_CID | ipfs --api $IPFS_API dag put --input-codec dag-json --store-codec dag-cbor)
  if [ x$PRE_CID != x$1 ]; then
    printf '{"error":"pre cid mismatch: %s %s"}' $PRE_CID $1
    exit 0
  fi
fi 

if [ x$INPUT_CID != x$3 ]; then
   printf '{"error":"input cid mismatch: %s %s"}' $INPUT_CID $3
fi
if [ x$GOV_CID != x$4 ]; then
   printf '{"error":"gov cid mismatch: %s %s"}' $GOV_CID $4
   exit 0
fi


printf "$PRE_CID\0$INPUT_CID\0$GOV_CID\0" > "${TASK_DIR}/pre.cid"
truncate -s 4K "${TASK_DIR}/pre.cid"

if [ -e /dev/kvm ]; then
  qemu-system-x86_64 \
    -enable-kvm -no-acpi -M microvm,x-option-roms=off,pic=off,isa-serial=off,rtc=on -cpu host -device virtio-serial-device \
    -nodefaults -no-user-config -nographic -no-reboot \
    -smp cpus=1,cores=1,threads=1 \
    -m 512m \
    -chardev stdio,id=virtiocon0 \
    -device virtconsole,chardev=virtiocon0 \
    -device virtio-blk-device,drive=drive0 \
    -drive "id=drive0,driver=raw,if=none,readonly=on,file=$COURT_IMAGE" \
    -device virtio-blk-device,drive=drive1 \
    -drive "id=drive1,driver=raw,if=none,file=$OUTPUT_IMAGE" \
    -device virtio-blk-device,drive=drive2 \
    -drive "id=drive2,driver=raw,if=none,readonly=on,file=$STATE_IMAGE" \
    -device virtio-blk-device,drive=drive3 \
    -drive "id=drive3,driver=raw,if=none,readonly=on,file=$APP_IMAGE" \
    -device virtio-blk-device,drive=drive4 \
    -drive "id=drive4,driver=raw,if=none,cache=unsafe,file=$SCRATCH_IMAGE" \
    -device virtio-blk-device,drive=drive5 \
    -drive "id=drive5,driver=raw,if=none,readonly=on,file=${TASK_DIR}/pre.cid" \
    -device virtio-blk-device,drive=drive6 \
    -drive "id=drive6,driver=raw,if=none,readonly=on,file=$INPUT_IMAGE" \
    -kernel "$KERNEL" \
    -append "earlyprintk=hvc0 console=hvc0 reboot=t root=/dev/vda init=/qemu-init" &> ${TASK_DIR}/qemu.log
else
  KERNEL="/app/bzImage-nokvm-q35"

  qemu-system-x86_64 \
    -nographic -no-reboot \
    -M q35,accel=tcg \
    -m 512m \
    -cpu max \
    -smp cpus=1,cores=1,threads=1 \
    -drive "driver=raw,if=virtio,readonly=on,file=${COURT_IMAGE}" \
    -drive "driver=raw,if=virtio,file=${OUTPUT_IMAGE}" \
    -drive "driver=raw,if=virtio,readonly=on,file=${STATE_IMAGE}" \
    -drive "driver=raw,if=virtio,readonly=on,file=${APP_IMAGE}" \
    -drive "driver=raw,if=virtio,cache=unsafe,file=${SCRATCH_IMAGE}" \
    -drive "driver=raw,if=virtio,readonly=on,file=${TASK_DIR}/pre.cid" \
    -drive "driver=raw,if=virtio,readonly=on,file=${INPUT_IMAGE}" \
    -kernel "$KERNEL" \
    -append "earlyprintk=ttyS0 console=ttyS0 reboot=t root=/dev/vda init=/qemu-init" &> ${TASK_DIR}/qemu.log
fi

# XXX check output drive if it ended in an error first
e2cp ${TASK_DIR}/scratch.img:/state.squashfs ${TASK_DIR}
e2cp ${TASK_DIR}/scratch.img:/output.car ${TASK_DIR}
e2cp ${TASK_DIR}/scratch.img:/output/file ${TASK_DIR}/output.file
e2cp ${TASK_DIR}/scratch.img:/return.code ${TASK_DIR}

# technically speaking we don't need to publish this but it's good for DA
NEW_STATE_CID=$(ipfs --api $IPFS_API add --cid-version=1 -Q ${TASK_DIR}/state.squashfs)
OUTPUT_CID=$(ipfs --api $IPFS_API dag import ${TASK_DIR}/output.car | grep "Pinned root" | cut -f 2)
LOG2_STATE=$(python3 /app/log2.py ${TASK_DIR}/state.squashfs)
printf '{"gov":{"/":"%s"},"input":{"/":"%s"},"output":{"/":"%s"},"prev":{"/":"%s"},"state.squashfs":{"/":"%s"}}' $GOV_CID $INPUT_CID $OUTPUT_CID $PRE_CID $NEW_STATE_CID > ${TASK_DIR}/claim
cat ${TASK_DIR}/claim 1>&2
CLAIM_CID=$(ipfs --api $IPFS_API dag put --input-codec dag-json --store-codec dag-cbor < ${TASK_DIR}/claim)

CARTESI_MERKLE_ROOT_STATE=$(/opt/cartesi/bin/merkle-tree-hash \
  --page-log2-size=3 \
  --tree-log2-size=$LOG2_STATE \
  --input=${TASK_DIR}/state.squashfs)

KECCAK256_OUTPUT_FILE=$(python3 /app/keccak256.py ${TASK_DIR}/output.file)
if [ x$FAKE_IT = x ]; then
  printf '%s\0%s\0%s\0%s' $CLAIM_CID $(cat ${TASK_DIR}/return.code) $CARTESI_MERKLE_ROOT_STATE $KECCAK256_OUTPUT_FILE > ${TASK_DIR}/pre-keccak
else
  printf '%s\0%s\0%s\0%s' $CLAIM_CID $FAKE_IT $CARTESI_MERKLE_ROOT_STATE $KECCAK256_OUTPUT_FILE > ${TASK_DIR}/pre-keccak
fi
python3 /app/keccak256.py ${TASK_DIR}/pre-keccak > ${TASK_DIR}/keccak
xxd -r -p < ${TASK_DIR}/keccak > ${TASK_DIR}/keccak.raw
truncate -s 32 ${TASK_DIR}/output.bin

STATE_SIZE=$(stat -c %s ${TASK_DIR}/state.squashfs) 

if cmp -s ${TASK_DIR}/keccak.raw ${TASK_DIR}/output.bin; then
  printf '{"returnCode":%s,"outKeccak":"%s","claimCID":"%s","outputCID":"%s","stateMerkle":"%s","log2State":%s,"stateSize":%s,"outputFileKeccak":"%s"}' $(cat ${TASK_DIR}/return.code) $(cat ${TASK_DIR}/keccak) $CLAIM_CID $OUTPUT_CID $CARTESI_MERKLE_ROOT_STATE $LOG2_STATE $STATE_SIZE $KECCAK256_OUTPUT_FILE
  cat ${TASK_DIR}/qemu.log 1>&2
else
  if [ x$FAKE_IT != x ] ; then
    printf '{"returnCode":%s,"outKeccak":"%s","claimCID":"%s","outputCID":"%s","stateMerkle":"%s","log2State":%s,"stateSize":%s,"outputFileKeccak":"%s"}' $FAKE_IT $(cat ${TASK_DIR}/keccak) $CLAIM_CID $OUTPUT_CID $CARTESI_MERKLE_ROOT_STATE $LOG2_STATE $STATE_SIZE $KECCAK256_OUTPUT_FILE
  else
    echo -n '{"error":"mismatch in output and keccak"}'
  fi
  cat ${TASK_DIR}/qemu.log 1>&2
fi

rm -rf ${TASK_DIR}
