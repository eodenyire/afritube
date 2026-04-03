# <img src="../public/fav.png" width="35" height="35" style="vertical-align:middle;margin-right:-8px"/> AfriTube Deployment Guide

---

## Deployment Options

| Method | Best For |
|---|---|
| Vercel | Production (recommended) |
| Docker | Self-hosted / on-premise |
| Kubernetes | Enterprise / high-availability |
| Local | Development |

---

## 1. Vercel Deployment (Recommended)

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/eodenyire/afritube)

### Manual Setup

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repository
4. Set environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

5. Framework preset: **Vite**
6. Build command: `npm run build`
7. Output directory: `dist`
8. Click Deploy

### Add Vercel URL to Supabase

After deployment, add your Vercel URL to Supabase:
- Go to Supabase → Authentication → URL Configuration
- Add `https://your-app.vercel.app` to Redirect URLs

---

## 2. Docker Deployment

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### Build & Run

```bash
# Build the image
docker build -t afritube:latest .

# Run the container
docker run -d \
  -p 80:80 \
  --name afritube \
  afritube:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  afritube:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
      - VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
    restart: unless-stopped
```

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

> **Note:** Environment variables are baked into the Vite build at build time. Pass them as build args or use a `.env` file before building.

---

## 3. Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (minikube, EKS, GKE, AKS, or bare metal)
- `kubectl` configured
- Docker image pushed to a registry (Docker Hub, ECR, GCR)

### Push Image to Registry

```bash
# Tag and push to Docker Hub
docker tag afritube:latest yourdockerhubuser/afritube:latest
docker push yourdockerhubuser/afritube:latest
```

### Kubernetes Manifests

Create `k8s/` directory with the following files:

#### `k8s/namespace.yaml`
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: afritube
```

#### `k8s/configmap.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: afritube-config
  namespace: afritube
data:
  VITE_SUPABASE_URL: "https://your-project.supabase.co"
  VITE_SUPABASE_PROJECT_ID: "your-project-id"
```

#### `k8s/secret.yaml`
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: afritube-secrets
  namespace: afritube
type: Opaque
stringData:
  VITE_SUPABASE_PUBLISHABLE_KEY: "your-anon-key"
```

#### `k8s/deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: afritube
  namespace: afritube
  labels:
    app: afritube
spec:
  replicas: 2
  selector:
    matchLabels:
      app: afritube
  template:
    metadata:
      labels:
        app: afritube
    spec:
      containers:
        - name: afritube
          image: yourdockerhubuser/afritube:latest
          ports:
            - containerPort: 80
          envFrom:
            - configMapRef:
                name: afritube-config
            - secretRef:
                name: afritube-secrets
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
```

#### `k8s/service.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: afritube-service
  namespace: afritube
spec:
  selector:
    app: afritube
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

#### `k8s/ingress.yaml`
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: afritube-ingress
  namespace: afritube
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - afritube.yourdomain.com
      secretName: afritube-tls
  rules:
    - host: afritube.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: afritube-service
                port:
                  number: 80
```

#### `k8s/hpa.yaml` (Horizontal Pod Autoscaler)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: afritube-hpa
  namespace: afritube
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: afritube
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Check status
kubectl get pods -n afritube
kubectl get services -n afritube
kubectl get ingress -n afritube

# View logs
kubectl logs -f deployment/afritube -n afritube

# Scale manually
kubectl scale deployment afritube --replicas=3 -n afritube
```

### Rolling Update

```bash
# Update image
kubectl set image deployment/afritube afritube=yourdockerhubuser/afritube:v2 -n afritube

# Watch rollout
kubectl rollout status deployment/afritube -n afritube

# Rollback if needed
kubectl rollout undo deployment/afritube -n afritube
```

---

## 4. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Yes | Supabase project ID |

> All variables must be prefixed with `VITE_` to be accessible in the browser via Vite.

---

## 5. Production Checklist

- [ ] Environment variables set in deployment platform
- [ ] Supabase URL Configuration updated with production domain
- [ ] Email confirmation settings reviewed
- [ ] Google OAuth redirect URIs updated for production domain
- [ ] Storage bucket CORS configured for production domain
- [ ] RLS policies verified
- [ ] Custom domain configured (optional)
- [ ] SSL/TLS certificate active
