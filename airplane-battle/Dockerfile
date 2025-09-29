# 使用官方 nginx 镜像作为基础镜像
FROM nginx:alpine

# 设置工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的 nginx 页面
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物到 nginx 目录
COPY dist/ /usr/share/nginx/html/

# 复制 nginx 配置文件
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]