"""URL routing.

The API is a single GraphQL endpoint. GraphiQL, the in-browser explorer, is
enabled only when GRAPHIQL_ENABLED is on (it follows DEBUG by default). Request
limits live in graphql_view.py.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt

from .graphql_view import BoardGraphQLView

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "graphql",
        csrf_exempt(BoardGraphQLView.as_view(graphiql=settings.GRAPHIQL_ENABLED)),
        name="graphql",
    ),
]
