#!/bin/bash

while true; do
  ffmpeg -re -i stream.mp4 -vf yadif -acodec aac -strict experimental -ar 44100 -ac 2 -b:a 96k -vcodec libx264 -preset superfast -profile:v baseline -level 3.0 -r 25 -g 50 -coder 0 -maxrate 1250k -bufsize 1250k -filter:v "scale=640:354" -f flv rtmp://ts/dash/example
  sleep 1
done;