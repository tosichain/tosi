#! /bin/sh
tmpfile=$(mktemp /tmp/grab-and-hash.XXXXXX)
ipfs --timeout=$TIMEOUT --api $IPFS_API get -o $tmpfile $1 &> /dev/null
if [ $? -ne 0 ]; then 
    printf '{"error":"failed"}'
    exit 0
fi
RESOLVE=$(ipfs --timeout=$TIMEOUT --api $IPFS_API dag resolve $1)
if [ x$NO_HASH = xtrue ]; then
  LOG2=$(python3 /app/log2.py $tmpfile)
  SIZE=$(stat -c %s $tmpfile)
  rm -f $tmpfile
  ipfs --api $IPFS_API pin add $1 &> /dev/null
  printf '{"log2":%s,"size":"%s","resolve":"%s"}' $LOG2 $KECCAK256 $CARTESI_MERKLE_ROOT $SIZE $RESOLVE
  exit 0
fi
LOG2=$(python3 /app/log2.py $tmpfile) 
SIZE=$(stat -c %s $tmpfile)
KECCAK256=$(python3 /app/keccak256.py $tmpfile)

if [ $LOG2 -lt 10 ]; then
   LOG2=10
fi
 
CARTESI_MERKLE_ROOT=$(/opt/cartesi/bin/merkle-tree-hash \
  --page-log2-size=3 \
  --tree-log2-size=$LOG2 \
  --input=$tmpfile)

rm -f $tmpfile
ipfs --api $IPFS_API pin add $1 &> /dev/null
printf '{"log2":%s,"keccak256":"%s","cartesi_merkle_root":"%s","size":"%s","resolve":"%s"}' $LOG2 $KECCAK256 $CARTESI_MERKLE_ROOT $SIZE $RESOLVE
