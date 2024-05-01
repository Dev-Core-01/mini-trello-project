"""Populate the board with a fictional community-group board for demos and screenshots."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from boards.services import CardService

SEED_CARDS = [
    (
        "Draft the spring newsletter",
        "Lead with the new opening hours and the volunteer drive.",
        "todo",
    ),
    (
        "Book a venue for the summer meetup",
        "Two halls shortlisted; decide by Friday.",
        "todo",
    ),
    ("Collect photos from the repair workshop", "", "todo"),
    (
        "Update the volunteer handbook",
        "Section 3 still describes the old sign-up form.",
        "todo",
    ),
    (
        "Redesign the sign-up form",
        "Fewer fields, and the postcode becomes optional.",
        "in-progress",
    ),
    (
        "Move the mailing list to the new provider",
        "Export done; importing in batches of 500.",
        "in-progress",
    ),
    ("Write the onboarding checklist", "", "in-progress"),
    ("Order new name badges", "Arrived on Tuesday.", "done"),
    ("Publish the autumn event calendar", "", "done"),
    ("Fix the broken link in the site footer", "", "done"),
]


class Command(BaseCommand):
    help = "Insert a set of demo cards. Existing cards are left alone."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete every existing card before seeding.",
        )

    def handle(self, *args, **options):
        service = CardService()

        if options["reset"]:
            removed = 0
            for card in list(service.repository.iter_all()):
                service.delete_card(card["id"])
                removed += 1
            self.stdout.write(f"Removed {removed} existing card(s).")

        for title, description, status in SEED_CARDS:
            service.create_card(title=title, description=description, status=status)

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(SEED_CARDS)} cards onto the board."))
