#!/bin/sh
HOST='matiascodesal.com'
USER='matiascodesalcom'
PASSWD='MaCo2012!'
FILE='vlogsuite.min.js'

uglifyjs vlogsuite.js -o vlogsuite.min.js -c -m
ftp -n $HOST <<END_SCRIPT
user $USER $PASSWD
put $FILE
bye
END_SCRIPT
exit 0