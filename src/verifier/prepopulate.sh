#!/bin/sh
mkdir -p /tmp/empty
ls -alR /data/prepopulate
ipfs --api $IPFS_API add -Q --cid-version=1 -r /tmp/empty
ipfs --api $IPFS_API add -Q --cid-version=1 /data/prepopulate/*
for x in /data/prepopulate-car/*.car; do 
  ipfs --api $IPFS_API dag import --stats < $x
done
for x in /data/ext-car/*.car; do
  ipfs --api $IPFS_API dag import --stats < $x
done
