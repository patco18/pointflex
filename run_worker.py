#!/usr/bin/env python
"""Start an RQ worker with Flask app context."""
import os
from redis import Redis
from rq import Worker, Connection

from backend.app import create_app
from backend.utils.webhook_utils import WEBHOOK_QUEUE_NAME


def main():
    app = create_app()
    redis_url = app.config.get("REDIS_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    conn = Redis.from_url(redis_url)

    with app.app_context():
        with Connection(conn):
            worker = Worker([WEBHOOK_QUEUE_NAME])
            worker.work()


if __name__ == "__main__":
    main()
