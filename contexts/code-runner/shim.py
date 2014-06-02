#!/usr/bin/python3
import sys
from subprocess import Popen, PIPE
import tarfile
import io

import socket
import sys
 
HOST = ''   # Symbolic name, meaning all available interfaces
PORT = 8888
CREATE_SH = '/usr/local/bin/createtmp.sh'
 
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print('Socket created')

def split_by_marker(f, marker = b'\xe2\x90\x84', block_size = 4096):
    current = bytearray()
    while True:
        block = f.read(block_size)
        if not block: # end
            print("no block")
            yield current
            return
        print("must have been block")
        current += block
        while True:
            markerpos = current.find(marker)
            if markerpos < 0:
                break
            yield current[:markerpos]
            current = current[markerpos + len(marker):]
 
#Bind socket to local host and port
try:
    s.bind((HOST, PORT))
except socket.error as msg:
    print('Bind failed. Error Code : ' + str(msg[0]) + ' Message ' + msg[1])
    sys.exit()
     
s.listen(10)
print('Socket now listening')

def get_temp_file(is_dir=False):
    tmp_cmd = [CREATE_SH, '-d'] if is_dir else [CREATE_SH]
    p = Popen(tmp_cmd, stdout=PIPE)
    p.wait()
    return p.stdout.read().decode().rstrip().replace('\n', '')

 
#now keep talking with the client
while True:
    #wait to accept a connection - blocking call
    conn, addr = s.accept()
    print('Connected with ' + addr[0] + ':' + str(addr[1]))

    huge = bytearray()
    
    while True:
        data = conn.recv(4096)
        if not data: 
            print("nothing found")
            break

        print("appending")
        huge += data

    conn.send(b'working...')
    print("held in memory, fix this")

    for script in split_by_marker(io.BytesIO(huge)):
        tmp_file = get_temp_file()
        tmp_dir = get_temp_file(True)

        with open(tmp_file, 'wb+') as tgz:
            tgz.write(bytearray(script))
            #tgz.write(script.rstrip().replace('\n', ''))


        tar = tarfile.open(tmp_file, 'r:*')

        tar.extractall(tmp_dir)
        tar.close()

        test_p = Popen(['mocha', '-R', 'json-cov'], cwd=(tmp_dir+'/merged'), stdout=PIPE)
        test_p.wait()
        conn.send(test_p.stdout.read()) 
     
s.close()
