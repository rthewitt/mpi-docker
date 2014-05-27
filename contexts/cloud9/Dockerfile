# I don't see how this could work...
FROM mpi:node-cloud9

#USER root
VOLUME ["/workspace"]

#ADD setup.sh /usr/local/bin/setup-cloud9
RUN npm install -g sm
RUN /usr/local/lib/node_modules/sm/bin/sm install-command
 
# version 0.7
RUN git clone https://github.com/ajaxorg/cloud9.git
RUN cd cloud9; npm install

ADD ./myelin/student.js /cloud9/configs/student.js
ADD ./myelin/ext.myelin /cloud9/plugins-client/ext.myelin

RUN npm install formidable@latest
RUN npm install gnu-tools@latest
 
#EXPOSE 3131
EXPOSE 80

#screen -S cloud9server -L -dm bash -c "cd cloud9; sudo ./bin/cloud9.sh -l 0.0.0.0 -p 3131"
# Fix this - add screen or forever, and make it an entrypoint
CMD ["/cloud9/bin/cloud9.sh", "student", "-l", "0.0.0.0", "-w", "/workspace"]
