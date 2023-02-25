#! /bin/sh

STATE_IMAGE="init_state.squashfs"

VALIDATOR_ROOT="$(pwd)"
APP_IMAGE="${VALIDATOR_ROOT}/app/build/app.squashfs"
COURT_IMAGE="${VALIDATOR_ROOT}/court/build/court.squashfs"

KERNEL_IMAGE="linux-5.5.19-ctsi-2.bin"
ROOTFS_IMAGE="rootfs.ext2"

CMD=${1:-"court-init"}

echo "Generating blank scratch file..."
dd if=/dev/zero of=./scratch.ext2 bs=1 count=0 seek=2048M

echo "Launching Cartesi Virtual Machine..."
exec cartesi-machine \
	--rom-image="../rom/build/rom.bin" \
	--append-rom-bootargs="loglevel=8" \
	--ram-image="../kernel/$KERNEL_IMAGE" \
	--ram-length="1024Mi" \
	--flash-drive="label:root,filename:../fs/$ROOTFS_IMAGE" \
	--flash-drive="label:court,filename:$COURT_IMAGE" \
	--flash-drive="label:output,length:1<<12" \
	--flash-drive="label:code,filename:$APP_IMAGE" \
	--flash-drive="label:prev_state,filename:$STATE_IMAGE" \
	--flash-drive="label:scratch,filename:scratch.ext2" \
	-- $CMD
