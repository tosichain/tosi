#! /bin/sh
VALIDATOR_ROOT="$(pwd)"
STATE_IMAGE="${VALIDATOR_ROOT}/deps/images/empty.squashfs"
APP_IMAGE="${VALIDATOR_ROOT}/deps/images/app.squashfs"
COURT_IMAGE="${VALIDATOR_ROOT}/deps/images/court.squashfs"
ROM_IMAGE="${VALIDATOR_ROOT}/deps/images/cartesi/rom.bin"
KERNEL_IMAGE="${VALIDATOR_ROOT}/deps/images/cartesi/linux-5.5.19-ctsi-2.bin"
ROOTFS_IMAGE="${VALIDATOR_ROOT}/deps/images/cartesi/rootfs.ext2"

CMD=${1:-"court-init"}

rm -rf stored_machine

echo "Launching Cartesi Virtual Machine..."
# 
/opt/cartesi/bin/cartesi-machine \
	--ram-image="$KERNEL_IMAGE" \
	--ram-length="512Mi" \
	--rom-image="$ROM_IMAGE" \
	--no-root-flash-drive \
	--flash-drive="label:root,length:1<<27" \
	--flash-drive="label:court,length:1<<27" \
	--flash-drive="label:output,length:1<<12" \
	--flash-drive="label:code,length:1<<32" \
	--flash-drive="label:prev_state,length:1<<32" \
	--flash-drive="label:scratch,length:1<<32" \
	--flash-drive="label:pre,length:1<<12" \
	--flash-drive="label:input,length:1<<32" \
	--max-mcycle=0 \
	--initial-hash \
	--store=stored_machine
	
HASH=$(/opt/cartesi/bin/cartesi-machine-stored-hash stored_machine)
echo HASH = $HASH
cd stored_machine; for x in *; do fallocate -d $x; done; cd ..
mkdir -p machines
rm -rf machines/$HASH
mv -v stored_machine machines/$HASH