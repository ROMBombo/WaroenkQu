FROM python:3.12-alpine3.21 AS build

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY pyproject.toml ./
COPY src ./src
# Bytecode (__pycache__) sengaja dipertahankan supaya start cepat (tidak compile ulang setiap start)
RUN pip install . && pip uninstall -y pip

# Runtime: hanya virtualenv berisi aplikasi dan dependency-nya
FROM python:3.12-alpine3.21

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apk add --no-cache tzdata && adduser -D -H app
COPY --from=build /opt/venv /opt/venv

# Jalan sebagai user non-root
USER app

CMD ["catalog-publisher"]
