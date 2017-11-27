# mpi-docker
Better faster stronger

Hahaha, what an awesome project this was!

I wrote this thing over the course of a week or so. It drew upon work I'd done on a product I wrote once that led to my collaboration with [CodeWars](https://www.codewars.com/).  That product was for community colleges to put courses online, and teach AI and data structures.  This one was just a code challenge site.

Essentially, it runs a fork of [Cloud9 IDE](https://c9.io/) in the browser inside of a docker container for each student in the course.

I wrote several plugins for the IDE to present projects incrementally using git tree traversal.  (js-git in this project, JGit when it was a java portlet container.  Remember those?!)

The old product automated the creation and management of an AWS Virtual Private Cloud (VPC), complete with an layer 2 VPN I templated on a custom AWS router AMI, when that stuff was hard. This one reduces cost using Docker, and keeps state with Redis running in a container.

IIRC this uses SaltStack for configuration management.  These projects were a fun way to mix code and infrastructure.

*By the way*, I was learning the js-git tree-walking API and never refactored the callbacks.  Old abandoned code needs cleanup...
