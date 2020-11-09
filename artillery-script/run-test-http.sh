#!/bin/sh

artillery_in_path=$(which artillery)
if [ $artillery_in_path"foo" = "foo" ]
then
  echo "Install artillery locally: npm install -g artillery"
  exit 1
fi

artillery run scripts/local-asst-503-http.yaml