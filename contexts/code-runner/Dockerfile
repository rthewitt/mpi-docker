FROM mpi:node
MAINTAINER Ryan Hewitt "rthewitt.devel@gmail.com"

#USER noderunner
RUN npm install -g mocha
ADD shim.py /usr/local/bin/run

USER nobody

#CMD ["/usr/local/bin/run"]
#ENTRYPOINT ["/usr/bin/python"]

CMD ["-c", "/usr/bin/python usr/local/bin/run"]
ENTRYPOINT ["/bin/bash"]
