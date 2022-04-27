FROM node:13-alpine as base
ENV BUILDDIR=/builddir

COPY package.json ${BUILDDIR}/package.json
WORKDIR ${BUILDDIR}
RUN npm install
COPY . $BUILDDIR
RUN npm run build
###
FROM nginx:1.19.3-alpine

ENV BUILDDIR=/builddir

COPY --from=base $BUILDDIR/dist/test-app /usr/share/nginx/html

EXPOSE 80
