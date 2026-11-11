#!/usr/bin/env bash
# Run on SGP3 as root. Arguments are immutable, fork-owned web/backend image refs.
set -euo pipefail
[[ $EUID == 0 ]] || { echo '请在 SGP3 以 root 运行'; exit 1; }
[[ $# == 2 ]] || { echo '用法: deploy-fluxa.sh WEB_IMAGE BACKEND_IMAGE'; exit 1; }
web=$1 backend=$2
[[ $web =~ ^ghcr\.io/caigee-cmd/fluxastudios-web(:sha-[0-9a-f]{7,40}|@sha256:[0-9a-f]{64})$ ]]
[[ $backend =~ ^ghcr\.io/caigee-cmd/fluxastudios-backend(:sha-[0-9a-f]{7,40}|@sha256:[0-9a-f]{64})$ ]]
cd /opt/open-ai-canvas
compose=(docker compose -f docker-compose.deploy.yml)
# Pull explicitly before invoking this script, or docker load the verified CI artifacts.
docker image inspect "$web" "$backend" >/dev/null
backup="/root/fluxa-studios-ops/backups/$(date +%Y%m%d-%H%M%S)"
install -d -m 700 "$backup"
cp -p .env docker-compose.deploy.yml "$backup/"
chmod 600 "$backup/.env"
export FLUXA_WEB_IMAGE="$web" FLUXA_BACKEND_IMAGE="$backend"
python3 - <<'PY'
import json, os, re, urllib.request
from pathlib import Path
s=json.load(urllib.request.urlopen('http://127.0.0.1:3000/api/auth/settings'))['data']
assert s['registrationEnabled'] is False and s['emailEnabled'] is True
assert s['agreementContent']
p=Path('docker-compose.deploy.yml');t=p.read_text()
assert '"127.0.0.1:${CANVAS_HTTP_PORT:-3000}:3000"' in t, '先恢复 web 的 localhost 绑定'
p=Path('.env');t=p.read_text()
assert re.search(r'^CANVAS_REGISTRATION_ENABLED=false\s*$', t, re.M), '环境变量必须明确关闭注册'
for key,value in [('CANVAS_WEB_IMAGE',os.environ['FLUXA_WEB_IMAGE']),('CANVAS_BACKEND_IMAGE',os.environ['FLUXA_BACKEND_IMAGE'])]:
    pattern=r'^'+key+r'=.*$'
    t=re.sub(pattern,key+'='+value,t,flags=re.M) if re.search(pattern,t,re.M) else t+'\n'+key+'='+value+'\n'
# No other environment values (especially mail, CORS and registration) are altered.
p.write_text(t);p.chmod(0o600)
PY
# A regular /etc unit cannot be masked until it is safely moved out of the way.
systemctl disable --now open-ai-canvas-updater.service
unit=/etc/systemd/system/open-ai-canvas-updater.service
if [[ -f $unit && ! -L $unit ]]; then mv "$unit" "$backup/open-ai-canvas-updater.service"; fi
systemctl mask open-ai-canvas-updater.service
systemctl daemon-reload
"${compose[@]}" config --quiet
# New backend images may require a newer schema. Migrate while the old/new
# backend is stopped, so an older binary never sees a newer schema, and a
# newer binary is never started against an older schema.
status=0
"${compose[@]}" stop backend || true
"${compose[@]}" run --rm migrate || status=$?
if [[ $status != 0 ]]; then
  echo "数据库迁移失败；备份: $backup。未启动新后端。"
  exit "$status"
fi
# Always reattach SMTP immediately after the backend recreation attempt, even on failure.
"${compose[@]}" up -d --no-deps --force-recreate backend || status=$?
(cd /root/fluxa-smtp-bridge && docker compose up -d --no-deps --force-recreate fluxa-smtp-bridge)
[[ $status == 0 ]] || { echo "后端重建失败；备份: $backup"; exit "$status"; }
"${compose[@]}" up -d --no-deps --force-recreate web
printf '部署命令已完成；备份: %s。请按文档执行健康、协议、注册、端口与 SMTP 验收。\n' "$backup"
