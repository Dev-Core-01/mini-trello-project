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
