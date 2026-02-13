import threading

_request_store = threading.local()


def set_current_request(request):
    _request_store.request = request


def get_current_request():
    return getattr(_request_store, "request", None)
