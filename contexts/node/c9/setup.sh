#!/bin/bash

apt-get update
# get ec2 ip and hostname
 
apt-get install -y python build-essential g++ libssl-dev apache2-utils git libxml2-dev screen
 
#install node
git clone https://github.com/joyent/node.git
# git checkout v0.10.13 did work once, but I couldn't work again, so I fell back to 0.8

#compilation takes over 30 minutes on a t1.micro
cd node; git checkout v0.8.22; ./configure; make; make install; cd ..
