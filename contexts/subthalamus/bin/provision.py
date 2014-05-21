import boto
import boto.vpc
import time
import sys
import salt, salt.key, salt.runner, salt.client
from jinja2 import Environment, FileSystemLoader
import logging

logger = logging.getLogger('thalamus')

class MockInstance(object):
    __slots__ = ('id','private_dns_name','private_ip_address')
    def __init__(self, id='id-glial', private_dns_name='glial.testing-only', private_ip_address='glial'):
        self.id = id
        self.private_dns_name = private_dns_name
        self.private_ip_address = private_ip_address

class MockReservation(object):
    __slots__ = ('id','instances')
    def __init__(self, id='glial-stub', instances=None):
        self.id = id
        if instances is not None:
            self.instances = instances
        else:
            self.instances = []

# TODO extract jinja template, salt from provision and share
def stub_boto(image_type, course_uuid, student_ids, init_ref, token):
    logger.info('Stubbing out boto for course_uuid :%s', course_uuid)
    machine = MockInstance()
    student_instances = zip(student_ids, len(student_ids)*[machine])
    reservation = MockReservation(len(student_ids)*[machine])
    return student_instances, reservation

def terminate_machines_boto(instance_ids):
    mpi_conn = get_mpi_connection()
    mpi_conn.terminate_instances(instance_ids=instance_ids)

def get_mpi_connection():
   return boto.vpc.connect_to_region('us-west-2')

def provision_boto(image_type, course_uuid, student_ids, init_ref, token):
   """ Provisions against MPI VPC on Amazon AWS. Need to place important cloud information into properties or global map """
   # image_id = ... ... mpi_conn.get_all_snapshots
      # old image_id='ami-d245d1e2'
      # student_image_id='ami-ce73e7fe'
   if image_type == "STUDENT":
      image_id='ami-1179ef21'
   else:
      # Cloud Base image_id='ami-48c94378'
      raise Exception("Cannot provision image type "+image_type)

   mpi_conn = get_mpi_connection()

   for cloud in mpi_conn.get_all_vpcs():
      if cloud.id == 'vpc-7af5cb13':
         break

   # Problem here, handle it
   if cloud is None or cloud.id != 'vpc-7af5cb13':
      sys.exit()

   for sn in mpi_conn.get_all_subnets():
      if sn.id == 'subnet-55f5cb3c':
         break

   if sn == None or sn.id != 'subnet-55f5cb3c':
      sys.exit()

   # user_data may be checkout script to start instance, or else salt-master will call minion.
   # Due to serial nature of this, salt-call on minion is sufficient
   # Somewhere I read about using either cloud_init or salt to have multiple instances choose thier own identity
   # either with additional_info or something.  They used an array and they chose metadata via index.  TODO recover
   s_groups = ['sg-763e201a']
   num_students = len(student_ids)

   reservation = mpi_conn.run_instances(image_id, min_count=1, max_count=num_students, key_name='neurogenesis', instance_type='t1.micro', subnet_id=sn.id, disable_api_termination=False, instance_initiated_shutdown_behavior=None, private_ip_address=None, client_token=token, security_group_ids=s_groups, additional_info=None, network_interfaces=None)

   # get instances to create or modify file
   w_res = reservation

   # loop until reservation instances are running
   pending = True
   while pending:
      instances = w_res.instances
      pending = False
      for instance in instances:
         if instance.state != 'running':
            if instance.state != 'pending':
               logger.error("unexpected instance state for instance %s: %s", instance.id, instance.state)
            else:
               logger.debug("instances pending...")
               pending = True
               break # from for loop
      if pending:
         time.sleep(20)
         old_res = w_res # convieniently does not maintain equality upon refresh
         for rez in mpi_conn.get_all_instances():
            if rez.id == reservation.id:
               w_res = rez
         if old_res == w_res: # should have changed
            raise Exception("reservation object did NOT change between requests")


   # ====== HANDLE SALT ===========
   opts = salt.config.master_config('/etc/salt/master')
   sk = salt.key.Key(opts)
   lc = salt.client.LocalClient()
   rc = salt.runner.RunnerClient(opts)

   # Full return data
   student_instances = zip(student_ids, instances)
   # for ease of use, data verification and pillar construction
   expected = [i.private_dns_name.split('.')[0] for i in instances]

   logger.debug("expected %s", expected)
   if len(expected) == len(student_ids):
      s_data = zip(expected, student_ids)
   else:
      raise Exception("Something went wrong: "+str(len(student_ids))+" students and "+str(len(expected))+" minions")

   # jinja template
   t_env = Environment(loader=FileSystemLoader('templates'))
   t_sls = t_env.get_template('student-pillar.sls')
   
   # write to pillar sls, and then call top after accepting minions
   # Note: they may actually top themselves after being accepted
   student_pillar = t_sls.render(minions=s_data, course_uuid=course_uuid)
   logger.debug("rendered sls: %s", student_pillar)
   with open("/srv/pillar/student-data.sls", "wb") as ff:
      ff.write(student_pillar)

   for minion in expected:
      for count in range(0,4):
         if minion not in sk.list_keys()['minions_pre']:
            logger.debug("minion %s not yet detected, sleeping", minion)
            logger.debug(sk.list_keys())
            time.sleep(30)
         else:
            break
      if minion not in sk.list_keys()['minions_pre']:
         raise Exception("minion "+minion+" not found")
      # accept these instances via salt-key
      sk.accept(minion)

   for minion in expected:
      for count in range(0,4):
         if minion not in rc.cmd('manage.status',[])['up']:
            logger.debug("minion %s not actively responding, sleeping", minion)
            logger.info(rc.cmd('manage.status',[]))
            time.sleep(30)
         else:
            break
      if minion not in rc.cmd('manage.status',[])['up']:
         raise Exception("Minion not responding: "+ minion)

   ret = lc.cmd('roles:student', 'state.highstate', [], expr_form='grain') 
   logger.debug("result of highstate %s", ret)
   return student_instances, reservation





def test(image_type='STUDENT', course_uuid=None, student_ids=['test-student-1','test-student-2'], init_ref='check-0', token=None):
   if token is None or course_uuid is None:
      raise Exception('must provide course, token')
   return provision_boto(image_type, course_uuid, student_ids, init_ref, 'test-token-'+token)

def main():
   return test(course_uuid=sys.argv[1], token='test-token-'+sys.argv[2])


if __name__ == '__main__':
   main()
