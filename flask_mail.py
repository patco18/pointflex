class Message:
    def __init__(self, subject='', recipients=None, body='', html=''):
        self.subject = subject
        self.recipients = recipients or []
        self.body = body
        self.html = html

class Mail:
    def __init__(self, app=None):
        self.outbox = []
        if app:
            self.init_app(app)
    def init_app(self, app):
        app.extensions = getattr(app, 'extensions', {})
        app.extensions['mail'] = self
    def send(self, message):
        self.outbox.append(message)
