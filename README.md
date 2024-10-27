# Pulumi example - AWS EKS cluster

This repo contains a Pulumi project to deploy an AWS EKS cluster with configurable
EKS managed worker node groups.

## Architecture

VPC with the following subnets (in each AZ):

- private subnets (for the EKS cluster control plane and managed worker nodes)

EKS cluster:

- private access to Kubernetes API allowed
- public access to Kubernetes API allowed (for whitelisted CIDRs only)
  - note: this does not require public subnets in the VPC

## Configuration

Review (and update, if necessary) the values in:

- Pulumi.dev.yaml
- Pulumi.test.yaml
- Pulumi.prod.yaml

## Deployment

```bash
pulumi up -s <enviroment>  # dev/test/prod
```

## Tear down

```bash
pulumi destroy --remove -s <environment>  # dev/test/prod
```

## Extensions (road map)

Beyond this very basic example, I would recommend the following:

- configure auth for cluster
- add public subnets if egress is required (e.g. to pull container images from public registries)
- add config for a pipeline (e.g. GitHub Actions)
- store any secrets in a secrets manager (e.g. AWS SSM Parameter Store, AWS Secrets Manager, etc.)

