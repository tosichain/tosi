export IPFS_DIR="${VALIDATOR_ROOT}/ipfs"

ipfs init --profile server -e
ipfs daemon --offline & 

VALIDATOR_ROOT="$PWD"
mkdir -p $VALIDATOR_ROOT/data

KERNEL="${VALIDATOR_ROOT}/bzImage"
APP_IMAGE="/opt/verifier/app.squashfs"
COURT_IMAGE="/opt/verifier/court.squashfs"

STATE_IMAGE="/opt/verifier/empty.squashfs"

SCRATCH_IMAGE="${VALIDATOR_ROOT}/data/scratch.ext2"
SCRATCH_SIZE=4096M

INPUT_IMAGE="${VALIDATOR_ROOT}/data/input.bin"
INPUT_SIZE=128

OUTPUT_IMAGE="${VALIDATOR_ROOT}/data/output.bin"
OUTPUT_SIZE=128

[ -e "$OUTPUT_IMAGE" ] && rm "$OUTPUT_IMAGE"
[ -e "$SCRATCH_IMAGE" ] && rm "$SCRATCH_IMAGE"

echo "Generating output file..."
dd if=/dev/zero of="$INPUT_IMAGE" bs=1 count=0 seek="$INPUT_SIZE"

echo "Generating output file..."
dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1 count=0 seek="$OUTPUT_SIZE"

echo "Generating blank scratch file..."
dd if=/dev/zero of="$SCRATCH_IMAGE" bs=1 count=0 seek="$SCRATCH_SIZE"

STATE_CID=$(ipfs add --only-hash --cid-version=1 -Q $STATE_IMAGE)
COURT_CID=$(ipfs add --only-hash --cid-version=1 -Q $COURT_IMAGE)
APP_CID=$(ipfs add --only-hash --cid-version=1 -Q $APP_IMAGE)
INPUT_CID=$(ipfs add --only-hash --cid-version=1 -Q $INPUT_IMAGE)

PRE_CID=$(printf '{"state.squashfs":{"/":"%s"},"app.img":{"/":"%s"},"court.img":{"/":"%s"},"input":{"/":"%s"}}' $STATE_CID $APP_CID $COURT_CID $INPUT_CID | ipfs dag put)

echo -n $PRE_CID > ${VALIDATOR_ROOT}/data/pre.cid
truncate -s 4K ${VALIDATOR_ROOT}/data/pre.cid

if [ -z "${NO_KVM}" ]; then
  echo "Launching qemu..."
  exec qemu-system-x86_64 \
    -enable-kvm -nodefaults -no-user-config -nographic -no-acpi -no-reboot \
    -M microvm,x-option-roms=off,pic=off,isa-serial=off,rtc=on, \
    -cpu host \
    -smp cpus=1,cores=1,threads=1 \
    -m 512m \
    -chardev stdio,id=virtiocon0 \
    -device virtio-serial-device \
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
    -drive "id=drive5,driver=raw,if=none,readonly=on,file=${VALIDATOR_ROOT}/data/pre.cid" \
    -kernel "$KERNEL" \
    -append "earlyprintk=hvc0 console=hvc0 reboot=t root=/dev/vda init=/qemu-init"
else
  KERNEL="/app/bzImage-nokvm-q35"

  exec qemu-system-x86_64 \
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
    -drive "driver=raw,if=virtio,readonly=on,file=${VALIDATOR_ROOT}/data/pre.cid" \
    -kernel "$KERNEL" \
    -append "earlyprintk=ttyS0 console=ttyS0 reboot=t root=/dev/vda init=/qemu-init"
fi