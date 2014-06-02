#/usr/bin/python3
from subprocess import Popen, PIPE
from io import BytesIO
import io
import tarfile
import os 
import sys
import json

if "RUNNER" in os.environ:
    language = os.environ["RUNNER"]
else:
    raise Exception("Runner not specified")

script = ''

bound = ['timeout', '3']

ARG = 1
STDIN = 2

commands = {
        'javascript' : { 'command': ['node'], 'method': STDIN },
        #'javascript' : { 'command': ['mocha', '-R', 'json-cov'], 'method': STDIN },
        'coffeescript': { 'command': ['coffee', '-e'], 'method': ARG },
        'python' : { 'command': ['/opt/ve/pyrunner/bin/python'], 'method': STDIN }
        }

if not language in commands:
    raise Exception("Runner does not exist")


def split_by_marker(f, marker = b'\xe2\x90\x84', block_size = 4096):
    current = bytearray()
    while True:
        block = f.read(block_size)
        if not block: # end
            yield current
            return
        current += block
        while True:
            markerpos = current.find(marker)
            if markerpos < 0:
                break
            yield current[:markerpos]
            current = current[markerpos + len(marker):]

while True:

    while True:
        print("reading")
        line = sys.stdin.read()
        if not line:
            print("nothing")
            continue

        print("Recieved")

#    bugfix = io.open(sys.stdin.fileno(), 'rb')
#    print("starting main loop")
#    whole = bytearray()
#
#    while True:
#        print("reading")
#        partial = bugfix.readline()
#        #partial = sys.stdin.readline()
#        print("read")
#        if not partial:
#            break
#        else:
#            print("received")
#            whole += partial
#            continue
#
#    print("after initial inner loop")
#    if whole is '':
#        print("was blank continueing")
#        continue
#
#    print("after whole was not blank")
#
#    nwho = BytesIO(whole)
    
    for script in split_by_marker(sys.stdin.buffer):
    #for script in split_by_marker(nwho):
        #print('script: '+script)
    #    if iLine == '\xe2\x90\x84':
        print("about to")
        p = Popen(['/usr/local/bin/createtmp.sh'], stdout=PIPE)
        p.wait()
        tmp_file = p.stdout.read()
        with open(tmp_file, 'wb+') as tgz:
            #tgz.write(script.rstrip().replace('\n', ''))
            tgz.write(bytearray(script))


        tar = tarfile.open(tmp_file, 'r:*')

        tar.extractall('./what')
        print("closing after extracting tar")
        tar.close()
