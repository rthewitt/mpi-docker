#!/bin/bash

./cloud9/bin/cloud9.sh student -l 0.0.0.0 -w /workspace &
while :
do
    echo "root:"
    ls -la / | grep set
    echo "workspace:"
    ls -la /workspace | grep set
    sleep 5
done
