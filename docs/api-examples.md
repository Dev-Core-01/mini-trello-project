# API examples

Captured on 2026-11-09 against the Docker Compose stack after
`python manage.py seed_board --reset`. The stack ran on remapped host ports;
the commands below use the default port 8001. Every response is literal output.

## Fetch the board

Lanes plus the first page of cards. `nextCursor` is opaque; pass it back as `cursor` for the next page.

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"{ lanes { id title position } cardPage(limit: 2) { cards { id title status } nextCursor hasNextPage } }"}' | python -m json.tool
{
    "data": {
        "lanes": [
            {
                "id": "todo",
                "title": "To Do",
                "position": 0
            },
            {
                "id": "in-progress",
                "title": "In Progress",
                "position": 1
            },
            {
                "id": "done",
                "title": "Done",
                "position": 2
            }
        ],
        "cardPage": {
            "cards": [
                {
                    "id": "10bd9506-28bb-46f7-ad7a-785cc15bc55f",
                    "title": "Update the volunteer handbook",
                    "status": "todo"
                },
                {
                    "id": "439045d1-6600-46d4-8c17-248f46a42240",
                    "title": "Order new name badges",
                    "status": "done"
                }
            ],
            "nextCursor": "eyJpZCI6ICI0MzkwNDVkMS02NjAwLTQ2ZDQtOGMxNy0yNDhmNDZhNDIyNDAifQ==",
            "hasNextPage": true
        }
    }
}
```

## Create a card

`status` is optional and defaults to the first lane.

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"mutation { createCard(title: \"Print the meetup flyers\", status: \"todo\") { card { id title status } } }"}' | python -m json.tool
{
    "data": {
        "createCard": {
            "card": {
                "id": "92de6cad-3ebb-44c8-8169-6acd22d5f5b5",
                "title": "Print the meetup flyers",
                "status": "todo"
            }
        }
    }
}
```

## A blank title is a validation error

Business-rule failures come back in the `errors` array with `data.createCard` set to null, not as an HTTP 500.

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"mutation { createCard(title: \"   \") { card { id } } }"}' | python -m json.tool
{
    "errors": [
        {
            "message": "Title is required.",
            "locations": [
                {
                    "line": 1,
                    "column": 12
                }
            ],
            "path": [
                "createCard"
            ]
        }
    ],
    "data": {
        "createCard": null
    }
}
```

## An unknown lane is rejected

The message lists the valid lane ids from `boards/lanes.py`.

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"mutation { createCard(title: \"x\", status: \"nowhere\") { card { id } } }"}' | python -m json.tool
{
    "errors": [
        {
            "message": "Unknown status 'nowhere'. Expected one of: todo, in-progress, done.",
            "locations": [
                {
                    "line": 1,
                    "column": 12
                }
            ],
            "path": [
                "createCard"
            ]
        }
    ],
    "data": {
        "createCard": null
    }
}
```

## Too many root fields in one request

Each `allCards` is a table scan, so a request may select at most `GRAPHQL_MAX_ROOT_FIELDS` (10) root fields. The check runs before any resolver.

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"{ a: allCards { id } b: allCards { id } c: allCards { id } d: allCards { id } e: allCards { id } f: allCards { id } g: allCards { id } h: allCards { id } i: allCards { id } j: allCards { id } k: allCards { id } }"}' | python -m json.tool
{
    "errors": [
        {
            "message": "An operation may select at most 10 root fields.",
            "locations": [
                {
                    "line": 1,
                    "column": 1
                }
            ]
        }
    ]
}
```

## An unknown card id returns null

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"{ card(id: \"does-not-exist\") { id title } }"}' | python -m json.tool
{
    "data": {
        "card": null
    }
}
```

## Deleting a card that is not there reports failure

`success` is false rather than a fake success.

```console
$ curl -s -X POST http://localhost:8001/graphql -H 'Content-Type: application/json' \
    -d '{"query":"mutation { deleteCard(cardId: \"does-not-exist\") { success } }"}' | python -m json.tool
{
    "data": {
        "deleteCard": {
            "success": false
        }
    }
}
```
