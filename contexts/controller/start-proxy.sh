#!/bin/bash

# The internal port for this proxy doesn't matter
# This app container needs to inherit the port from REDIS

export APP_FOLDER=/srv/bridge/apps

echo "Starting test application for id: 112"

node $APP_FOLDER/proxy-server/dynamic-proxy.js
