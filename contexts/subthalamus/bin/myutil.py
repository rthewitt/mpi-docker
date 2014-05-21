import subprocess

# note that we've apparently settled on BASE-number convention for tags
def get_next_basetag(base, current):
   proc = subprocess.Popen(['/bin/bash', 'next-check-point.sh', base, current], stdout=subprocess.PIPE)
   out, err = proc.communicate()
   return out if base in out else None

