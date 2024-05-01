import { gql } from "@apollo/client";

export const CARD_FIELDS = gql`
  fragment CardFields on CardType {
    id
    title
    description
    status
  }
`;

/** The server caps a page at 200 cards; the board asks for full pages. */
export const BOARD_PAGE_SIZE = 200;

/**
 * Lanes come from the server's lane registry, so adding a lane needs no
 * frontend change. Cards arrive in pages; useBoard follows the cursor until
 * the whole board is loaded.
 */
export const GET_BOARD = gql`
  ${CARD_FIELDS}
  query GetBoard($cursor: String) {
    lanes {
      id
      title
      position
    }
    cardPage(limit: ${BOARD_PAGE_SIZE}, cursor: $cursor) {
      cards {
        ...CardFields
      }
      nextCursor
      hasNextPage
    }
  }
`;
