FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html product.html logos.html style.css app.js product.js config.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 80
