FROM nginx:1.27-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY frontend/src /usr/share/nginx/html
COPY frontend/src/pages/index.html /usr/share/nginx/html/index.html
COPY images /usr/share/nginx/html/images
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]