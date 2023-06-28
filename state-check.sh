#!/bin/bash

# Docker Compose version
output=$(docker compose version --short)

if [ $? -ne 0 ]; then
  echo "ERROR: Docker Compose could not be found. Please install Docker Compose."
  exit 1
fi

echo "Running with Docker Compose version: $output"

# Check Docker Compose version and to be 2 and above
major_version=$(echo $output | cut -d. -f1 | tr -d v)

if [ $major_version -lt 2 ]; then
    echo "ERROR: Docker Compose version 2 or higher is required."
    exit 1
fi
# default BLS secret key value
DEFAULT_BLS_SECRET_KEY="26e0e72ee4c67d7d3bb69b2dd50dfdec5c19bf086f553c856a9f3c4863680df0"

# Read the BLS secret key from the configuration file
BLS_SECRET_KEY=$(cat ./docker-compose/config/docker-compose-tosi-node-mainnet/client.yml | grep blsSecKey | cut -d: -f2 | tr -d ' ')

# If the BLS secret key is the default value, stop and throw an error
if [ "$BLS_SECRET_KEY" == "$DEFAULT_BLS_SECRET_KEY" ]; then
  echo "ERROR: BLS secret key is set to the example key in ./docker-compose/config/docker-compose-tosi-node-mainnet/client.yml, please generate and set a new one."
  exit 1
fi
