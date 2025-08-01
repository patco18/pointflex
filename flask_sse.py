from flask import Blueprint

class DummySSE(Blueprint):
    def __init__(self):
        super().__init__('sse', __name__)

    def publish(self, *args, **kwargs):
        pass

sse = DummySSE()
