FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html product.html thank-you.html logos.html profit-calculator.html style.css profit-calculator.css app.js product.js thank-you.js profit-calculator.js tracking.js config.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 80
