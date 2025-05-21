FROM ghcr.io/dojoengine/dojo:v1.5.0 AS dojo

RUN apt update && apt install curl jq -y

FROM ghcr.io/dojoengine/katana:v1.5.1 AS katana


FROM ghcr.io/dojoengine/torii:v1.5.1 AS torii

RUN apt update && apt install jq -y
