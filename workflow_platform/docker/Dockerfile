FROM nginx:1.27-alpine

COPY workflow_platform/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY workflow_platform/frontend /usr/share/nginx/html
COPY virtual_machining_platform/UnityBuild /usr/share/nginx/html/virtual-machining/UnityBuild

EXPOSE 80
