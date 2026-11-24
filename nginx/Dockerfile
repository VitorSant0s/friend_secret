FROM nginx:1.27-alpine

RUN apk add --no-cache certbot

COPY entrypoint.sh /entrypoint.sh
COPY http-only.conf.template /nginx/http-only.conf.template
COPY tls.conf.template /nginx/tls.conf.template

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
