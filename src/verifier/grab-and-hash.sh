#! /bin/sh
tmpfile=$(mktemp /tmp/grab-and-hash.XXXXXX)
ipfs --timeout=$TIMEOUT --api $IPFS_API get -o $tmpfile $1 &> /dev/null
if [ $? -ne 0 ]; then 
    printf '{"error":"failed"}'
    exit 0
fi
SIZE=$(stat -c %s $tmpfile)

LOG2=31
 
CARTESI_MERKLE_ROOT=$(/app/merkle-tree-hash \
  --log2-word-size=3 \
  --log2-root-size=$LOG2 \
  --log2-leaf-size=12 \
  --input=$tmpfile)

rm -f $tmpfile
ipfs --api $IPFS_API pin add $1 &> /dev/null
printf '{"cartesi_merkle_root":"%s","size":"%s"}' $CARTESI_MERKLE_ROOT $SIZE
