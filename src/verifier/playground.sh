#! /bin/sh
#
# Enter into cartesi playground, to access cartesi-machine command.
#

CMD=${1:-"/bin/bash --login"}

exec docker run -it --rm \
  -e USER=$(id -u -n) \
  -e GROUP=$(id -g -n) \
  -e UID=$(id -u) \
  -e GID=$(id -g) \
  -e HOME=/home/$(id -u -n) \
  -v `pwd`:/home/$(id -u -n) \
  -w /home/$(id -u -n) \
  carsten_descartes_machine_manager:latest $CMD
