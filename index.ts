import * as pulumi from "@pulumi/pulumi";

import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";


const config = new pulumi.Config();

const environment = pulumi.getStack();

const region = config.require("region");
const availabilityZones = config.requireObject<string[]>("availabilityZones");

const allowedCidrs = config.requireObject<string[]>("allowedCidrs");
const nodeGroupConfigs = config.require("nodeGroupConfigs");


// VPC
const vpc = new aws.ec2.Vpc(`${environment}-vpc`, {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
    tags: {
        Name: `${environment}-vpc`,
        Environment: `${environment}`,
    },
});

// Private subnets in VPC
const privateSubnets = availabilityZones.map((az, index) => {
    return new aws.ec2.Subnet(`${environment}-private-subnet-${az}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index * 16}.0/20`,
        availabilityZone: az,
        mapPublicIpOnLaunch: false,
        tags: {
            Name: `${environment}-private-subnet-${az}`,
            Environment: `${environment}`,
        },
    });
});


// Instance Role for EKS worker nodes
const eksInstanceRole = new aws.iam.Role(`${environment}-eksInstanceRole`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }),
});

// Attach policies to the IAM role
new aws.iam.RolePolicyAttachment(`${environment}-eksWorkerPolicyAttachment`, {
    role: eksInstanceRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
});

new aws.iam.RolePolicyAttachment(`${environment}-eksCniPolicyAttachment`, {
    role: eksInstanceRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
});

new aws.iam.RolePolicyAttachment(`${environment}-ecrReadOnlyPolicyAttachment`, {
    role: eksInstanceRole,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
});


// EKS cluster
const cluster = new eks.Cluster(`${environment}-eksCluster`, {
    vpcId: vpc.id,
    subnetIds: privateSubnets.map(subnet => subnet.id),
    instanceRoles: [eksInstanceRole],
    endpointPrivateAccess: true,
    endpointPublicAccess: true, // Allow public access to API endpoint
    publicAccessCidrs: allowedCidrs, // Restrict public access to API endpoint to the allowed CIDRs only
});

// EKS managed node groups
const nodeGroups = nodeGroupConfigs.map(cfg =>
    cluster.createNodeGroup(`${environment}-${cfg.name}`, {
        instanceType: cfg.instanceType as aws.ec2.InstanceType,
        desiredCapacity: cfg.desiredCapacity,
        minSize: cfg.minSize,
        maxSize: cfg.maxSize,
    })
);

// Exports
export const vpcId = vpc.id;
export const privateSubnetIds = privateSubnets.map(subnet => subnet.id);
export const clusterName = cluster.eksCluster.name;
export const kubeconfig = cluster.kubeconfig;

