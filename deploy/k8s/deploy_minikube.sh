#!/bin/bash

export CLUSTER_NAME=minikube
export NAMESPACE=apinatomy
export CF_BUILD_ID=latest
export REGISTRY=
export DOMAIN=apinatomy.local

source ./deploy.sh
