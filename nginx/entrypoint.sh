#!/bin/sh
set -eu

DOMAIN="${DOMAIN:?defina DOMAIN no arquivo .env}"
EMAIL="${CERTBOT_EMAIL:-}"
WEBROOT="/var/www/certbot"
LIVE="/etc/letsencrypt/live/$DOMAIN"

mkdir -p "$WEBROOT"

issue_certificate() {
	echo "[nginx] emitindo certificado para $DOMAIN"

	sed "s|\${DOMAIN}|$DOMAIN|g" /nginx/http-only.conf.template \
		> /etc/nginx/conf.d/default.conf

	# sobe só para responder ao desafio do Let's Encrypt
	nginx -g 'daemon off;' &
	NGINX_PID=$!
	sleep 3

	if [ -n "$EMAIL" ]; then
		certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
			--agree-tos --non-interactive --email "$EMAIL" || true
	else
		certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
			--agree-tos --non-interactive --register-unsafely-without-email || true
	fi

	kill "$NGINX_PID" 2>/dev/null || true
	wait "$NGINX_PID" 2>/dev/null || true

	if [ ! -f "$LIVE/fullchain.pem" ]; then
		echo "[nginx] não foi possível emitir o certificado de $DOMAIN."
		echo "[nginx] confira se o DNS já aponta para este servidor e se as portas 80 e 443 estão abertas."
		sleep 20
		exit 1
	fi
}

if [ ! -f "$LIVE/fullchain.pem" ]; then
	issue_certificate
fi

sed "s|\${DOMAIN}|$DOMAIN|g" /nginx/tls.conf.template \
	> /etc/nginx/conf.d/default.conf

# renovação automática; só recarrega quando o certificado muda
(
	while :; do
		sleep 43200
		if certbot renew --webroot -w "$WEBROOT" --quiet; then
			nginx -s reload || true
		fi
	done
) &

exec nginx -g 'daemon off;'
