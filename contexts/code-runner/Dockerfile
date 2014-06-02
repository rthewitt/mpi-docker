FROM mpi:node
MAINTAINER Ryan Hewitt "rthewitt.devel@gmail.com"

#USER noderunner
RUN apt-get install python3 -y
RUN npm install -g mocha
ADD shim.py /usr/local/bin/run
ADD createtmp.sh /usr/local/bin/createtmp.sh

EXPOSE 8888

USER nobody

CMD ["-c", "/usr/bin/python3 /usr/local/bin/run"]
ENTRYPOINT ["/bin/bash"]
