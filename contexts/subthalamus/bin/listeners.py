import json
import logging

logger = logging.getLogger('thalamus')

# Set up a shared class for command flow, somewhere
class JSONListener(object):

   def __init__(self, command_list, default):
      super(JSONListener, self).__init__()
      self.commands = command_list # how are references handled?!! TODO figure out immediately if copy needed
      self.default = default # will likely be an error broadcast

   def on_error(self, headers, message):
      logger.error('received an error %s', message)

   def on_message(self, headers, message):
      logger.info('received a message %s', message)
      j_message = json.loads(message)
      logger.debug('moving to if statement')
      if 'command' in j_message:
         logger.debug('command existed')
         action = j_message['command']
         logger.debug("command was %s", action)
         try:
            context = j_message['context']
            command = self.commands.get(action, self.default)(context)
            command.do() # hope
         except Exception, err:
            logger.error('Problem in JSONListener:\n%s', str(err))
      else:
         logger.warn("Unrecognized broadcast")
