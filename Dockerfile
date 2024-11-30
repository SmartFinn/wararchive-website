FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ADD . /app/
RUN uv sync --frozen --no-editable --no-cache --compile-bytecode \
    && rm -f .python-version uv.lock pyproject.toml

FROM python:3.12-slim
LABEL maintainer="SmartFinn (https://github.com/SmartFinn)" \
    org.opencontainers.image.title="telegram-tracker" \
    org.opencontainers.image.description="Telegram tracker and GeoJSON uploader" \
    org.opencontainers.image.source="https://github.com/SmartFinn/wararchive-website"

ENV LANG=C.UTF-8 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

COPY --from=builder --chown=nobody:nogroup /app /app

WORKDIR /app

USER nobody

VOLUME [ "/data", "/app/config" ]

ENTRYPOINT ["bash", "/app/entrypoint.sh"]
