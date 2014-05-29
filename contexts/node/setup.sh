#!/bin/bash
apt-get update
apt-get install -y python build-essential g++ libssl-dev apache2-utils git libxml2-dev screen
 
#install node
git clone https://github.com/joyent/node.git
cd node; git checkout v0.10.22; ./configure; make; make install; cd ..
