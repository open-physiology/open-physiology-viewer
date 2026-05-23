#!/bin/bash

# Setup script for creating a minikube instance and build the needed applications

minikube start --memory 4000 --cpus 2 --disk-size 40g --driver=docker --kubernetes-version=v1.21.2
minikube addons enable ingress

# make sure we are on minikube
kubectl config use-context minikube

kubectl create ns apinatomy
kubectl create rolebinding apinatomy-default --clusterrole=admin --serviceaccount=apinatomy:default -n apinatomy

eval $(minikube docker-env)
kubectl config use-context minikube
