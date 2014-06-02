#!/bin/bash
if [ "$1" = "-d" ]; then
    TMP=$(/bin/mktemp -d)
else
    TMP=$(/bin/mktemp) 
    chmod o+r "$TMP"
fi

echo "$TMP"
