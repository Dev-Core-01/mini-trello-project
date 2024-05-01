"""The GraphQL endpoint as the browser reaches it: JSON over HTTP POST."""

from __future__ import annotations


def post_graphql(client, query: str, **variables):
    return client.post(
        "/graphql",
        data={"query": query, "variables": variables},
        content_type="application/json",
    )


def test_the_endpoint_answers_a_board_query(client, seeded, card_table):
    response = post_graphql(client, "{ lanes { id } allCards { id status } }")

    assert response.status_code == 200
    body = response.json()
    assert "errors" not in body
    assert len(body["data"]["allCards"]) == len(seeded)


def test_a_validation_failure_is_reported_in_the_errors_array(client, card_table):
    response = post_graphql(
        client,
        "mutation Add($title: String!) { createCard(title: $title) { card { id } } }",
        title="   ",
    )

    body = response.json()
    assert body["errors"][0]["message"] == "Title is required."
    assert body["data"] == {"createCard": None}


def test_cors_allows_the_configured_frontend_origin(client, card_table):
    response = client.options(
        "/graphql",
        HTTP_ORIGIN="http://localhost:3000",
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
    )

    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"


class TestRequestLimits:
    def test_aliasing_a_root_field_past_the_limit_is_rejected(
        self, client, card_table, settings
    ):
        settings.GRAPHQL_MAX_ROOT_FIELDS = 3
        query = "{ " + " ".join(f"a{i}: allCards {{ id }}" for i in range(4)) + " }"

        body = post_graphql(client, query).json()

        assert body["errors"][0]["message"] == "An operation may select at most 3 root fields."
        assert "data" not in body or body["data"] is None

    def test_root_fields_hidden_in_fragments_are_counted(self, client, card_table, settings):
        settings.GRAPHQL_MAX_ROOT_FIELDS = 2
        query = """
            query { ...Board ... on Query { c: lanes { id } } }
            fragment Board on Query { a: lanes { id } b: allCards { id } }
        """

        body = post_graphql(client, query).json()

        assert "at most 2 root fields" in body["errors"][0]["message"]

    def test_nesting_past_the_limit_is_rejected(self, client, card_table, settings):
        settings.GRAPHQL_MAX_DEPTH = 2

        body = post_graphql(client, "{ cardPage { cards { id } } }").json()

        assert body["errors"][0]["message"] == "An operation may nest at most 2 levels."

    def test_the_clients_board_query_fits_the_default_limits(self, client, seeded, card_table):
        query = "{ lanes { id title position __typename } cardPage { cards { id } } }"

        body = post_graphql(client, query).json()

        assert "errors" not in body

    def test_the_standard_validation_rules_still_run(self, client, card_table):
        body = post_graphql(client, "{ allCards { noSuchField } }").json()

        assert "Cannot query field 'noSuchField'" in body["errors"][0]["message"]

    def test_an_undefined_fragment_is_a_validation_error_not_a_crash(self, client, card_table):
        body = post_graphql(client, "{ ...Missing }").json()

        assert "Unknown fragment 'Missing'" in body["errors"][0]["message"]

    def test_a_fragment_cycle_does_not_hang_the_validator(self, client, card_table):
        query = """
            { cardPage { ...Loop } }
            fragment Loop on CardPage { cards { id } ...Loop }
        """

        body = post_graphql(client, query).json()

        assert body["errors"]

    def test_introspection_is_refused_when_disabled(self, client, card_table, settings):
        settings.GRAPHQL_INTROSPECTION = False

        body = post_graphql(client, "{ __schema { queryType { name } } }").json()

        assert "introspection is disabled" in body["errors"][0]["message"]

    def test_introspection_works_while_graphiql_is_on(self, client, card_table, settings):
        settings.GRAPHQL_INTROSPECTION = True

        body = post_graphql(client, "{ __schema { queryType { name } } }").json()

        assert body["data"]["__schema"]["queryType"]["name"] == "Query"
