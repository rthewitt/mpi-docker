#DANGER: This currently points to thalamus!!!!
# This file is managed by MPI python libraries.  Modifications will be overwritten.
# Grains can and should be used for education specific properties now.  roles: student, learn-vm
# TODO allow multiple course instances?  Somehow append instead of straight templating the sls file...
parietal-ip: 172.28.1.202
course-uuid: {{ course_uuid }}
{%- for minion in minions -%}
{% raw %}
{% if grains['id'] == {% endraw %}'{{ minion[0] }}' {% raw %}%}{% endraw %}
student-id: {{ minion[1] }}
{% raw %}{% endif %}{% endraw %}
{%- endfor %}
