#!/bin/bash

GIT_REPOS="git-repositories"
INTERNAL="internal-myelin"
PUBLIC_PROF="professor-bot"
LOGFILE=/var/log/myelin-lessons.log

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ] ; do SOURCE="$(readlink "$SOURCE")"; done

BIN_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
BASEDIR="$( cd "$BIN_DIR"/.. && pwd )"
PROF_DIR="$BASEDIR/$PUBLIC_PROF"
STUD_DIR="$BASEDIR/$PUBLIC_STUDENT"
PRIV_DIR="$BASEDIR/$INTERNAL"
PUBLIC_DIR="$BASEDIR/$GIT_REPOS"

PROTO_BRANCH=PROTOTYPE
NAMESPACE_ST=STUDENT

function f_yesno() {
   echo -n "$1 (y/n) "
   read ans
   # Consider accepting only yes/no answers
   # using a while loop
   case "$ans" in
      y|Y|yes|YES|Yes) return 0 ;;
      *) return 1 ;;
   esac
}

function pause() {
   read -p "$*"
}

function m_log() {
   echo "$1" >> $LOGFILE
}

fail() {
   m_log "$1"
   exit 1
}

# ================ Git specific functions =============

# This is only necessary for dumb transport, change to git+ssh
function make_server_ready() {
   # subshell to avoid hopping back and forth
   (
      cd "$1"
      mv hooks/post-update.sample hooks/post-update
      git update-server-info
   )
}

# decorator function for getting student branches
function get_student_branch_array() {
   local __resultvar=$1
   bstr=""; for b in `git branch | grep "$NAMESPACE_ST"`; do bstr="$bstr $b"; done
   local -a internal_array=($bstr)
   [ "${#internal_array[@]}" -gt 0 ] || fail "No student branches found..."
   eval $__resultvar="'${internal_array[@]}'"
}
