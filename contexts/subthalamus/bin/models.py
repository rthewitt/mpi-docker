from subprocess import call, STDOUT
import myutil
import notify
import provision
import logging
#import LookupError

logger = logging.getLogger('thalamus')
command_log = '/var/log/mpi/myelin-action.log'

class Tutorial(object):
   pass
   
class Command(object):
   
   def __init__(self, context):
      super(Command, self).__init__()
      self.course_uuid = context['courseUUID']
      self.prototype = context['prototype']
      self.command_id = '' if not 'id' in context else context['id']

   # we could just use __call__, but I don't want inheritance
   # I want implementation
   def do(self):
      raise LookupError('Action not not implemented')



class InitCommand(Command):
   """ This command is issued when we want to create a course, regardless of professor's existence.
       (bot may be used) """

   setup_script = "./setup-class-branches.sh"

   def __init__(self, context):
      super(InitCommand, self).__init__(context)
      self.students = context['students']
      self.testing = context['testing'] in ['true','True']

   def do(self):
      logger.debug("INSIDE")
      try:
         with open(command_log, 'w') as c_log:
            call([ self.setup_script, self.course_uuid, self.prototype['repository'], self._get_students_as_string() ], stdout=c_log, stderr=STDOUT)
         notify.send_receipt({'status':'success', 'type':'INITIALIZE', 'courseUUID': self.course_uuid, 'id':self.command_id, 'testing': str(self.testing)})
      except Exception, fu:
         notify.send_receipt({'status':'failure', 'type':'INITIALIZE', 'courseUUID': self.course_uuid, 'id':self.command_id, 'message': str(fu)})

   def _get_students_as_string(self):
      return " ".join([str(s['studentId']) for s in self.students])

class ProvisionCommand(Command):
   """ This command is used to spin up virtual machines for the purpose of authoring, student work or general tutorials.
       Current provider is AWS via Boto """

   def __init__(self, context):
      super(ProvisionCommand, self).__init__(context)
      self.token = context["token"]
      self.init_ref = context["initRef"]
      self.student_ids = context["studentIds"]
      self.stub_out = context["testing"] in ['true','True']
      if len(self.command_id) < 1:
         self.command_id = self.token
      self.image_type = context["type"]

   def do(self):
      logger.info("Starting provision with Boto for image type %s and token %s with students %s", self.image_type, self.token, " ".join(self.student_ids))
      try:
         if self.stub_out is True:
             student_instances, reservation = provision.stub_boto(self.image_type, self.course_uuid, self.student_ids, self.init_ref, self.token)
         else:
              student_instances, reservation = provision.provision_boto(self.image_type, self.course_uuid, self.student_ids, self.init_ref, self.token)
         instance_map = {}
         for student, machine in student_instances:
             logger.debug('Receipt mapping\nStudent: %s\nInstance %s', student, machine.id)
             m_rep = {}
             m_rep['host'] = machine.private_dns_name.split('.')[0]
             m_rep['location'] = machine.private_ip_address
             instance_map[student] = m_rep

         notify.send_receipt({'status':'success', 'type':'PROVISION_VM', 'courseUUID': self.course_uuid, 'id':self.command_id, 'instanceMap': instance_map})
         logger.info("Instances prepared: %s", " ".join([instance.id for instance in reservation.instances]))
      except Exception, pe:
         logger.error("Problem provisioning instances for course: \n%s", str(pe))
         notify.send_receipt({'status':'failure', 'type':'PROVISION_VM', 'courseUUID': self.course_uuid, 'id':self.command_id, 'message': str(pe)})


class UpdateCommand(Command):
   """ This command is issued when we want to merge a commit in from the Prototype branch """

   update_script = "./proto-merge.sh"
   
   def __init__(self, context):
      super( UpdateCommand, self).__init__(context)
      self.next_commit = context['commitRef']
      try:
         self.student = context['student']
      except Exception, err:
         logger.error("Problem getting student from context\n%s", str(err))

   def do(self):
      proc_arr = [ self.update_script, self.course_uuid, self.next_commit ]
      try:
         if self.student is not None:
            proc_arr.append(self.student)
         logger.info("Updating student via script %s", self.update_script)
         with open(command_log, 'w') as c_log:
            call(proc_arr, stdout=c_log, stderr=STDOUT)
      except Exception, fu:
         logger.error("Problem during update:\n%s", str(fu))
