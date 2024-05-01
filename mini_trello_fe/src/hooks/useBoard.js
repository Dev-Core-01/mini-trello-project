import { useCallback, useEffect, useMemo } from "react";
import { NetworkStatus, useMutation, useQuery } from "@apollo/client";

import {
  ADD_CARD,
  DELETE_CARD,
  MOVE_CARD,
  UPDATE_CARD,
} from "../graphql/mutations";
import { GET_BOARD } from "../graphql/queries";

/**
 * All of the board's data handling in one place.
 *
 * The page component previously owned the query, four mutations, a duplicated
 * copy of the server state and the reconciliation between them. Keeping it
 * here means the component only renders, and this logic can be tested on its
 * own.
 */
export function useBoard() {
  const { data, loading, error, fetchMore, networkStatus } = useQuery(GET_BOARD, {
    notifyOnNetworkStatusChange: true,
  });
  const cards = useMemo(() => data?.cardPage?.cards ?? [], [data]);

  // The board used to read a single page, so every card past the first 100
  // was silently missing. Follow the cursor until the server says it is done;
  // waiting for the ready status keeps it to one page request at a time.
  const nextCursor = data?.cardPage?.hasNextPage ? data.cardPage.nextCursor : null;
  useEffect(() => {
    if (nextCursor && networkStatus === NetworkStatus.ready) {
      fetchMore({ variables: { cursor: nextCursor } });
    }
  }, [nextCursor, networkStatus, fetchMore]);

  const [addCardMutation] = useMutation(ADD_CARD, {
    refetchQueries: [{ query: GET_BOARD }],
  });
  const [updateCardMutation] = useMutation(UPDATE_CARD);
  const [moveCardMutation] = useMutation(MOVE_CARD);
  const [deleteCardMutation] = useMutation(DELETE_CARD, {
    refetchQueries: [{ query: GET_BOARD }],
  });

  /**
   * Group cards into their lanes. Derived from the server response on every
   * render rather than copied into state, which is what previously let the
   * board drift out of sync after an edit.
   */
  const lanes = useMemo(() => {
    const laneDefinitions = data?.lanes ?? [];

    return [...laneDefinitions]
      .sort((a, b) => a.position - b.position)
      .map((lane) => ({
        ...lane,
        cards: cards.filter((card) => card.status === lane.id),
      }));
  }, [data, cards]);

  const cardCount = cards.length;

  const createCard = useCallback(
    ({ title, description, status }) =>
      addCardMutation({ variables: { title, description, status } }),
    [addCardMutation]
  );

  const updateCard = useCallback(
    ({ id, title, description }) =>
      updateCardMutation({ variables: { id, title, description } }),
    [updateCardMutation]
  );

  const deleteCard = useCallback(
    (id) => deleteCardMutation({ variables: { id } }),
    [deleteCardMutation]
  );

  /**
   * Move a card to another lane. The cache is updated immediately so the card
   * does not snap back while the request is in flight.
   */
  const moveCard = useCallback(
    (id, status) =>
      moveCardMutation({
        variables: { id, status },
        optimisticResponse: {
          updateCard: {
            __typename: "UpdateCard",
            card: {
              __typename: "CardType",
              ...cards.find((card) => card.id === id),
              id,
              status,
            },
          },
        },
      }),
    [moveCardMutation, cards]
  );

  return {
    lanes,
    cardCount,
    loading: loading && !data,
    error,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
  };
}
