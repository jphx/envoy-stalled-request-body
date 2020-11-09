# Local debug setup for incomplete body issue

## Background

This repository is used to reproduce a presumed Envoy problem involving
incomplete request bodies.  See Envoy issue https://github.com/envoyproxy/envoy/issues/13947.

## Setup

This test uses [Artillery](https://artillery.io/) to drive HTTP requests to
a backend service.

To install Artillery, build the nodejs test, and start the services:

```bash
npm install -g artillery
cd node-server
npm install
npm run-script build-image
cd ..
docker-compose up
```

In another shell window, to run the artillery load driver over https:
```bash
cd artillery-script
./run-test-https.sh
```

You can run the test using plain http also, but this doesn't seem to reproduce
the problem:
```bash
cd artillery-script
./run-test-http.sh
```

## Details of what's where

This project has dockerfiles and proxy configs and a stub nodejs app that attempts to mimic the error case that we see in the above issue. Of course, there are significant differences. But here is what is in these directories:

- haproxy - This runs haproxy with a configuration that listens for HTTP/HTTPS localhost:8082/localhost:8445 and forwards requests on the `/postme` path to Envoy via HTTP on port 8081 or HTTPS on port 8444.
- envoy - This runs envoy with a static config on HTTP/HTTPS localhost:8081/localhost:8444 that forwards requests on the `/postme` path to the node-server on port 8080 or HTTPS on port 8443.
- node-server - This has a simple node HTTP Server application with no dependent packages that listens on port 8080 (HTTP) and 8443 (HTTPS) and responds to POST (just POST, not GET) on the `/postme` path. It will log the request line, headers, and data that is received. It has a 200ms sleep in it.  Run `npm run-script build-image` to build the docker image for this test server.
- artillery-script - This has HTTP and HTTPS versions of the test script that we use to reproduce the issue that tests localhost:8082 and localhost:8445. Run `./run-test-http.sh` or `./run-test-https.sh` to run the HTTP or HTTPS versions of the script.
- docker-compose.yaml - This starts up haproxy, envoy, and the node server when you run `docker-compose up` in the root directory of this project.

## Notes

- The Artillery configuration submits one request per second for 30 seconds and then ends when a
  response is received to all requests.
- If the problem is reproduced, one or more response codes will be 503 instead of 200, and these
  failing requests will take a full two minutes.  What's happening is that the node server reads the
  `Content-Length` header and then tries to read that many bytes from the body of the request.  In
  the failing cases, it appears that Envoy stalls while sending request body bytes to the upstream
  server.  The upstream service therefore blocks trying to read the body bytes until the 120-second
  timeout in the node server cancels request processing and resets the connection to Envoy,
  triggering Envoy to return a 503 response.
- Ignore the fact that a registry host (`us.icr.io`) is used for the `node-server` Docker image.
  The test case won't try to access that server.
- The likelihood of reproducing the problem can be changed by altering the
  downstream `per_connection_buffer_limit_bytes` setting.
  ```yaml
    - address:
        socket_address:
          address: 0.0.0.0
          port_value: 8444
      # THIS LINE BREAKS THINGS. But it is recommended for untrusted downstreams. The default value is 1MiB
      per_connection_buffer_limit_bytes: 32768 # 32 KiB
      filter_chains:
  ```
- When I have that line in the envoy config, I can run a 30s load at 1 rps and generate 1 or 2 failures.
  Other developers say they have to run the test several times to see a failure.  The envoy tap data for those requests (grab the request ids from the long request output from the artillery script and grep in the envoy/taps folder to find the tap for that tx) shows that the content is truncated.
- I cannot reproduce the issue with the same config over HTTP. I tried the load for 300s at 20 rps and still couldn't make it fail over HTTP.
- Increasing the value of this limit to 64k allows the test to succeed, but then when you add more data to the posted data in the request it fails again.
- Interestingly enough, if you set this limit to 16k, the failure doesn't happen either. But it seems to cause spurts of delay. I think as many requests come in, any sort of overlap or slowdown or event loop contention will cause back pressure.
- I reset the envoy buffer setting to 32k and increased the `tune.bufsize` parameter in haproxy to `536576` (512k). This also stopped the problem from happening for some body sizes.
- By uncommenting the traffic-tapping configuration in the Envoy configuration file, you can capture
  downstream traffic.  The Docker Compose configuration arranges to mount the `envoy/taps` directory
  into the Envoy container, but since Envoy doesn't run as root, you might need to
  `chmod o+w envoy/taps` before running `docker-compose up` to ensure that Envoy can write to this
  host directory.
- Some developers report that turning on trace-level log messages seems to make the problem more
  likely to occur.  Probably just because it changes the timing.  To try turning on trace-level
  debugging, uncomment the `command` line in the `docker-compose.yaml` file.
- If you have difficult reproducing the problem, you can try increasing the request rate.  To do
  this, edit the file `artillery-script/scripts/local-asst-503-https.yaml` and change
  `config.phases.arrivalRate` from `1` to something higher, say `10`.
