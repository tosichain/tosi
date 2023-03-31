#! /bin/sh
# we should have this DA already, so no timeout
PREVIOUS_OUTPUT_CID=$1 # this is empty directory CAR if no previous output
INPUT_CID=$2
FUNCTION_CID=$3

TASK_DIR=$(mktemp -d /tmp/run-task.XXXXXX)

>&2 echo "TASK_DIR=${TASK_DIR}"

ipfs --api $IPFS_API dag export $PREVIOUS_OUTPUT_CID > "$TASK_DIR/previous_output.car" 
ipfs --api $IPFS_API dag export $INPUT_CID > "$TASK_DIR/input.car"
# this should be the size of the machine
truncate -s 2147483648 "$TASK_DIR/previous_output.car"
truncate -s 2147483648 "$TASK_DIR/input.car"

ipfs --api $IPFS_API get -o "$TASK_DIR/function.img" $FUNCTION_CID &> /dev/null

dd if=/dev/zero of=$TASK_DIR/scratch.img bs=1 count=0 seek=4096M

VALIDATOR_ROOT="/opt/validator"
SCRATCH_IMAGE="${TASK_DIR}/scratch.img"
KERNEL="/app/bzImage"
FUNCTION_IMAGE="${TASK_DIR}/function.img"

PREVIOUS_OUTPUT_IMAGE="${TASK_DIR}/previous_output.car"

INPUT_IMAGE="${TASK_DIR}/input.car"
OUTPUT_IMAGE="${TASK_DIR}/output.bin"
OUTPUT_SIZE=4096

dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1 count=0 seek="$OUTPUT_SIZE"

>&2 echo "PREVIOUS_OUTPUT_CID: ${PREVIOUS_OUTPUT_CID}"
>&2 echo "FUNCTION: ${FUNCTION_CID}"
>&2 echo "INPUT: ${INPUT_CID}"

if [ -e /dev/kvm ]; then
  qemu-system-x86_64 \
    -enable-kvm -no-acpi -M microvm,x-option-roms=off,pic=off,isa-serial=off,rtc=on -cpu host -device virtio-serial-device \
    -nodefaults -no-user-config -nographic -no-reboot \
    -smp cpus=1,cores=1,threads=1 \
    -m 512m \
    -chardev stdio,id=virtiocon0 \
    -device virtconsole,chardev=virtiocon0 \
    -device virtio-blk-device,drive=drive0 \
    -drive "id=drive0,driver=raw,if=none,readonly=on,file=$FUNCTION_IMAGE" \
    -device virtio-blk-device,drive=drive1 \
    -drive "id=drive1,driver=raw,if=none,file=$OUTPUT_IMAGE" \
    -device virtio-blk-device,drive=drive2 \
    -drive "id=drive2,driver=raw,if=none,readonly=on,file=$PREVIOUS_OUTPUT_IMAGE" \
    -device virtio-blk-device,drive=drive3 \
    -drive "id=drive3,driver=raw,if=none,cache=unsafe,file=$SCRATCH_IMAGE" \
    -device virtio-blk-device,drive=drive4 \
    -drive "id=drive4,driver=raw,if=none,readonly=on,file=$INPUT_IMAGE" \
    -kernel "$KERNEL" \
    -append "earlyprintk=hvc0 console=hvc0 reboot=t root=/dev/vda init=/qemu-init panic=1" &> ${TASK_DIR}/qemu.log
else
  KERNEL="/app/bzImage-nokvm-q35"

  qemu-system-x86_64 \
    -nographic -no-reboot \
    -M q35,accel=tcg \
    -m 512m \
    -cpu max \
    -smp cpus=1,cores=1,threads=1 \
    -drive "driver=raw,if=virtio,readonly=on,file=${FUNCTION_IMAGE}" \
    -drive "driver=raw,if=virtio,file=${OUTPUT_IMAGE}" \
    -drive "driver=raw,if=virtio,readonly=on,file=${PREVIOUS_OUTPUT_IMAGE}" \
    -drive "driver=raw,if=virtio,cache=unsafe,file=${SCRATCH_IMAGE}" \
    -drive "driver=raw,if=virtio,readonly=on,file=${INPUT_IMAGE}" \
    -kernel "$KERNEL" \
    -append "earlyprintk=ttyS0 console=ttyS0 reboot=t root=/dev/vda init=/qemu-init panic=1" &> ${TASK_DIR}/qemu.log
fi

# XXX check output drive if it ended in an error first
e2cp ${TASK_DIR}/scratch.img:/root/output.car ${TASK_DIR}
cat ${TASK_DIR}/qemu.log 1>&2

# technically speaking we don't need to publish this but it's good for DA
OUTPUT_CID=$(ipfs --api $IPFS_API dag import ${TASK_DIR}/output.car | grep "Pinned root" | cut -f 2)

printf '%s\0' $OUTPUT_CID > ${TASK_DIR}/pre-keccak
truncate -s 32 ${TASK_DIR}/output.bin

python3 /app/keccak256.py ${TASK_DIR}/pre-keccak > ${TASK_DIR}/keccak
xxd -r -p < ${TASK_DIR}/keccak > ${TASK_DIR}/keccak.raw

if cmp -s ${TASK_DIR}/keccak.raw ${TASK_DIR}/output.bin; then
  printf '{"outputCID":"%s"}' $OUTPUT_CID
else 
  echo -n '{"error":"mismatch in output and keccak"}'
fi
cat ${TASK_DIR}/qemu.log 1>&2
rm -rf ${TASK_DIR}
