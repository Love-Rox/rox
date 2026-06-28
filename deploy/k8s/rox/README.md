# Rox on K3S

Manifests for running Rox on the existing K3S cluster (control-plane
`samurai-watch`, worker `sakura` which holds the public IP and storage),
mirroring the ikaskey operational pattern: images on GHCR, auto-updated by a
**digest-diff CronJob** tracking the `:dev` tag.

## Components (namespace `rox`, all pinned to node `sakura`)

| Manifest | Purpose |
|----------|---------|
| `00-namespace.yaml` | namespace `rox` |
| `secret.example.yaml` | template for the `rox-config` secret (create the real one on the cluster) |
| `10-timescaledb.yaml` | TimescaleDB (PG16) StatefulSet + headless Service (charts backend) |
| `20-dragonfly.yaml` | Dragonfly (Redis-compatible) for cache/queue |
| `25-uploads-pvc.yaml` | shared local-path PVC for uploads (backend rw, nginx ro) |
| `30-backend.yaml` | `hono_rox` Deployment (initContainer runs migrations) + NodePort Service (`30092`, metrics) |
| `40-frontend.yaml` | `waku_rox` Deployment + Service |
| `50-nginx.yaml` | nginx reverse proxy (path + Accept-header routing) + NodePort `30091` |
| `60-autodeploy.yaml` | CronJob (+ SA/Role) that auto-updates the deployments from `:dev` |

Auto-update: the `rox-autodeploy` CronJob (`60-autodeploy.yaml`) runs every 5
minutes, fetches the digest of each image's `:dev` tag from GHCR, and runs
`kubectl set image ...@<digest>` when it differs from the running pod. This is
deterministic (pinned to the exact `:dev` tag) and uses a ServiceAccount scoped
to the `rox` namespace. (keel was tried first but mis-resolved the `:dev` tag
among sibling tags and its SA lacked RBAC here.) The backend initContainer
applies DB migrations on each boot.

## Images

Built and pushed by `.github/workflows/build-images.yml` on push to `dev`/`main`
and on `v*` tags:

- `ghcr.io/love-rox/rox-backend:dev`
- `ghcr.io/love-rox/rox-frontend:dev`

## First-time deploy

```bash
# On samurai-watch (control-plane). kubectl = `sudo k3s kubectl`.

# 1. Namespace + secret (generate from the bare-metal /opt/rox/.env, rewriting
#    DATABASE_URL to the in-cluster DB and adding CHARTS_*; pick a new DB password).
kubectl apply -f 00-namespace.yaml
kubectl -n rox create secret generic rox-config --from-env-file=./rox.env

# 2. Data layer
kubectl apply -f 10-timescaledb.yaml -f 20-dragonfly.yaml -f 25-uploads-pvc.yaml
kubectl -n rox rollout status statefulset/rox-timescaledb

# 3. Data migration from bare-metal (~14 MB):
#    pg_dump -Fc the bare-metal rox DB, then restore into rox-timescaledb,
#    and rsync the uploads/ dir into the rox-uploads PVC. (See migration notes.)

# 4. App + proxy
kubectl apply -f 30-backend.yaml -f 40-frontend.yaml -f 50-nginx.yaml
kubectl -n rox get pods

# 5. Smoke test via NodePort (before cutover):
#    curl -H 'Host: rox.love-rox.cc' http://<sakura-internal-ip>:30091/health
```

## Cutover (Cloudflare)

Add an ingress rule to the host cloudflared on `samurai-watch`
(`rox.love-rox.cc -> http://10.10.0.1:30091`), reload cloudflared, point the DNS
record at the tunnel, verify `https://rox.love-rox.cc`, then stop the bare-metal
`rox.service` and its nginx. Keep the bare-metal DB as a hot rollback.

## Notes

- The real `rox-config` secret is **never committed**; only `secret.example.yaml`.
- Mirror of these manifests lives on the cluster at `/srv/k3s-manifests/rox/`.
