#/usr/bin/python
from subprocess import Popen, PIPE
from StringIO import StringIO
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


def split_by_marker(f, marker = '\xe2\x90\x84', block_size = 4096):
    current = ''
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
    bugfix = io.open(sys.stdin.fileno(), 'rb')
    print "starting main loop"
    whole = ''
#    for partial in sys.stdin.readlines():
#        if not partial:
#            print "nope"
#            break
#        else:
#            print "received"
#            whole += partial
#            continue

    while True:
        print "reading"
        partial = bugfix.readline()
        #partial = sys.stdin.readline()
        print "read"
        if not partial:
            break
        else:
            print "received"
            whole += partial
            continue

    print "after initial inner loop"
    if whole is '':
        print "was blank continueing"
        continue

    print "after whole was not blank"

    nwho = StringIO(whole)
    
    #for script in split_by_marker(sys.stdin):
    for script in split_by_marker(nwho):
        print 'script: ', script
    #    if iLine == '\xe2\x90\x84':
        print "about to"
        p = Popen(['/usr/local/bin/createtmp.sh'], stdout=PIPE)
        p.wait()
        tmp_file = p.stdout.read()
        with open(tmp_file, 'wb+') as tgz:
            #tgz.write(script.rstrip().replace('\n', ''))
            tgz.write(bytearray(script))


        tar = tarfile.open(tmp_file, 'r:*')

        tar.extractall('./what')
        print "closing after extracting tar"
        tar.close()

#        tar = tarfile.open(tmp_file, 'r:*')
#        for tarinfo in tar:
#           print tarinfo.name, "is", tarinfo.size, "bytes in size and is",
#           if tarinfo.isreg():
#               print "a regular file."
#           elif tarinfo.isdir():
#               print "a directory."
#           else:
#               print "something else."
#        tar.close()

#       with open('/tmp/newfile.tar.gz', 'w+') as tar_output:
#           tar_output.write(script)

#       print "written"

#       tar = tarfile.open("/tmp/newfile.tar.gz", "r:gz")
#       for tarinfo in tar:
#           print tarinfo.name, "is", tarinfo.size, "bytes in size and is",
#           if tarinfo.isreg():
#               print "a regular file."
#           elif tarinfo.isdir():
#               print "a directory."
#           else:
#               print "something else."
#       tar.close()

#       conf = commands[language]
#       if conf['method'] is STDIN:
#           job = Popen(bound+conf['command'], stdin=PIPE, stdout=PIPE, stderr=PIPE)
#           out, err = job.communicate(script)
#           rett = job.returncode
#       elif conf['method'] is ARG:
#           job = Popen(bound+conf['command']+[script], stdout=PIPE, stderr=PIPE)
#           out, err = job.communicate(script)
#           rett = job.returncode
#
#       print json.dumps({'stdout': out, 'stderr': err, "exitCode": rett})
#       sys.stdout.flush()
#       out = None
#       err = None
#       script = ''
#    else:
#        print "adding"
#        script = script + iLine
