FROM nginx:alpine

# Install openssl
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/selfsigned.key \
    -out /etc/nginx/ssl/selfsigned.crt \
    -subj "/C=IN/ST=State/L=City/O=MySafety/CN=mysafety24x7.in"

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Expose standard web ports
EXPOSE 80 443
