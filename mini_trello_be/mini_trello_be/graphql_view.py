"""The /graphql endpoint, with limits on how much one request may ask for.

The schema is small, but GraphQL lets a client repeat a root field under
aliases (``a: allCards  b: allCards ...``) or nest fragments, and each
``allCards`` is a DynamoDB scan. These rules cap that before any resolver runs.
"""

from __future__ import annotations

from collections.abc import Iterator

from django.conf import settings
from graphene.validation import DisableIntrospection
from graphene_django.views import GraphQLView
from graphql import GraphQLError, ValidationRule, specified_rules
from graphql.language import (
    FieldNode,
    FragmentSpreadNode,
    InlineFragmentNode,
    OperationDefinitionNode,
    SelectionSetNode,
)


def _fields(selection_set: SelectionSetNode, context, seen=frozenset()) -> Iterator[FieldNode]:
    """Yield the non-introspection fields of a selection set, through fragments."""
    for selection in selection_set.selections:
        if isinstance(selection, FieldNode):
            if not selection.name.value.startswith("__"):
                yield selection
        elif isinstance(selection, InlineFragmentNode):
            yield from _fields(selection.selection_set, context, seen)
        elif isinstance(selection, FragmentSpreadNode):
            name = selection.name.value
            fragment = context.get_fragment(name)
            # Unknown or self-referencing fragments are reported by graphql-core's
            # own rules; here they are skipped so this rule cannot loop or crash.
            if fragment is not None and name not in seen:
                yield from _fields(fragment.selection_set, context, seen | {name})


def _depth(selection_set: SelectionSetNode, context, level: int, limit: int) -> int:
    """Depth of the deepest field below this selection set, stopping past the limit."""
    if level > limit:
        return level
    deepest = level
    for field in _fields(selection_set, context):
        if field.selection_set is not None:
            deepest = max(deepest, _depth(field.selection_set, context, level + 1, limit))
    return deepest


def request_limits_rule(max_depth: int, max_root_fields: int) -> type[ValidationRule]:
    class RequestLimits(ValidationRule):
        def enter_operation_definition(self, node: OperationDefinitionNode, *_args):
            root_fields = list(_fields(node.selection_set, self.context))
            if len(root_fields) > max_root_fields:
                self.report_error(
                    GraphQLError(
                        f"An operation may select at most {max_root_fields} root fields.",
                        node,
                    )
                )
            if _depth(node.selection_set, self.context, 1, max_depth) > max_depth:
                self.report_error(
                    GraphQLError(f"An operation may nest at most {max_depth} levels.", node)
                )

    return RequestLimits


class BoardGraphQLView(GraphQLView):
    """GraphQLView with depth, width and introspection limits taken from settings."""

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Passing validation_rules replaces graphql-core's defaults rather than
        # adding to them, so the standard rules must be listed explicitly.
        rules = [
            *specified_rules,
            request_limits_rule(settings.GRAPHQL_MAX_DEPTH, settings.GRAPHQL_MAX_ROOT_FIELDS),
        ]
        if not settings.GRAPHQL_INTROSPECTION:
            rules.append(DisableIntrospection)
        self.validation_rules = tuple(rules)
