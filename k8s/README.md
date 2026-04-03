# AfriTube Kubernetes Deployment

## Prerequisites
- Kubernetes cluster (minikube, EKS, GKE, AKS, or bare metal)
- `kubectl` configured and pointing to your cluster
- Docker image built and pushed to a registry
- NGINX Ingress Controller installed
- cert-manager installed (for TLS)

## Quick Deploy

```bash
# 1. Edit configmap.yaml and secret.yaml with your Supabase values

# 2. Apply all manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# 3. Check everything is running
kubectl get all -n afritube
```

## Useful Commands

```bash
# Watch pods come up
kubectl get pods -n afritube -w

# View logs
kubectl logs -f deployment/afritube -n afritube

# Scale manually
kubectl scale deployment afritube --replicas=3 -n afritube

# Rolling update (after pushing new image)
kubectl set image deployment/afritube afritube=yourdockerhubuser/afritube:v2 -n afritube
kubectl rollout status deployment/afritube -n afritube

# Rollback
kubectl rollout undo deployment/afritube -n afritube

# Delete everything
kubectl delete namespace afritube
```
