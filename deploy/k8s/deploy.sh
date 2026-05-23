#!/bin/bash

# set to the correct cluster context and namespace
kubectl config use-context $CLUSTER_NAME
kubectl config set-context $CLUSTER_NAME --namespace=$NAMESPACE

# prep the yamls
cp apinatomy_tpl.yaml apinatomy.yaml
cp ingress_tpl.yaml ingress.yaml

# apinatomy service and deployment
sed -ie 's/{{TAG}}/'$CF_BUILD_ID'/i' apinatomy.yaml
sed -ie 's|{{REGISTRY}}|'$REGISTRY'|i' apinatomy.yaml
kubectl apply -f apinatomy.yaml

# ingress
sed -ie 's|{{DOMAIN}}|'$DOMAIN'|i' ingress.yaml
kubectl apply -f ingress.yaml

# cleanup
rm -rf apinatomy.yaml* ingress.yaml*
