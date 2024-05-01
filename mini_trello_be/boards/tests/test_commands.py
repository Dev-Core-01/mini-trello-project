"""Management commands used by the Docker entrypoint and the README."""

from __future__ import annotations

from io import StringIO

from django.core.management import call_command
from moto import mock_aws

from boards import dynamodb
from boards.management.commands.seed_board import SEED_CARDS
from boards.repositories import CardRepository


def run_command(*args) -> str:
    out = StringIO()
    call_command(*args, stdout=out)
    return out.getvalue()


def test_init_dynamodb_creates_the_table_and_is_idempotent(aws_credentials):
    with mock_aws():
        dynamodb.reset_connection()

        assert "Created table" in run_command("init_dynamodb")
        assert "already exists" in run_command("init_dynamodb")

        dynamodb.reset_connection()


def test_seed_board_fills_every_lane(card_table):
    run_command("seed_board")

    cards = list(CardRepository().iter_all())
    assert len(cards) == len(SEED_CARDS)
    assert {card["status"] for card in cards} == {"todo", "in-progress", "done"}


def test_seed_board_reset_replaces_existing_cards(card_table, service):
    service.create_card(title="Left over from yesterday")

    output = run_command("seed_board", "--reset")

    assert "Removed 1 existing card(s)." in output
    titles = {card["title"] for card in CardRepository().iter_all()}
    assert "Left over from yesterday" not in titles
    assert len(titles) == len(SEED_CARDS)
