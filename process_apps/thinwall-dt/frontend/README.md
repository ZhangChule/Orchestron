# Thinwall-DT Frontend

This frontend belongs to the legacy `thinwall-dt` prototype.

Current Orchestron workflow development should not add new workflow-platform dependencies on this frontend. New virtual-machining UI/runtime updates belong under:

```text
virtual_machining_platform/UnityBuild/
workflow_platform/frontend/virtualMachiningWidget.js
contracts/virtual-machining/unity-bridge.md
```

Run the legacy prototype only when the historical standalone page is needed:

```powershell
docker compose -f process_apps/thinwall-dt/docker/compose.yml up -d --build
```

Standalone URL:

```text
http://localhost:18080/
```
