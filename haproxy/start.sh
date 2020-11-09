#!/bin/sh

docker run -t --name=local-asst-503-haproxy --rm \
	-v ${PWD}/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro \
	-v ${PWD}/errors/404.http:/usr/local/etc/haproxy/errors/404.http:ro \
	-p 8082:8082 -p 1081:1081 \
    haproxy:2.0