#!/usr/bin/python

import time
import sys
import json
import stomp
import logging

logger = logging.getLogger('thalamus')

class NotifyListener(object):
   def on_error(self, headers, message):
      logger.error('received a message %s', message)

   def on_message(self, headers, message):
      logger.info('received a message %s', message)

def main():
   num_args = len(sys.argv[1:])
   type = 'request'
   if not num_args == 4 and not num_args == 5:
      logger.error('usage: receipt.py <course_uuid> <student_id> <status_tag> <commit>')
      sys.exit(1)
   elif num_args == 5 and sys.argv[5] == '--confirm':
      type = 'confirm'
   command = json.dumps({'command': 'ADVANCE_STUDENT', 'context': {'status': type, 'courseUUID': sys.argv[1], 'studentId': sys.argv[2], 'checkpoint': sys.argv[3], 'commit': sys.argv[4]}})
   send(command)

def send_receipt(map_values):
   command = json.dumps({'command': 'RECEIPT', 'context': map_values})
   logger.info("sending %s", command)
   send(command)
   
def send(payload):
   conn = stomp.Connection([('localhost',61613)])
   conn.set_listener('', NotifyListener())
   logger.info('set up connection')
   conn.start()
   conn.connect()
   conn.send(payload, destination='/queue/incoming')
   time.sleep(2)
   conn.disconnect()



if __name__ == '__main__':
   main()
