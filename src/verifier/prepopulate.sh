#!/bin/sh
mkdir -p /tmp/empty
ls -alR /data/prepopulate
ipfs --api $IPFS_API add --cid-version=1 -r /tmp/empty
ipfs --api $IPFS_API add --cid-version=1 /data/prepopulate/*
