docker kill webs && docker rm webs
docker build -t mpi:wstest .
docker run -i -d --name="webs" mpi:wstest
