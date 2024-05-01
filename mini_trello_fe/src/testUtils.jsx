import { MockedProvider } from "@apollo/client/testing";
import { render } from "@testing-library/react";

import { createCache } from "./apollo";
import { GET_BOARD } from "./graphql/queries";

export const lanes = [
  { __typename: "LaneType", id: "todo", title: "To Do", position: 0 },
  { __typename: "LaneType", id: "in-progress", title: "In Progress", position: 1 },
  { __typename: "LaneType", id: "done", title: "Done", position: 2 },
];

export const card = (id, title, status, description = "") => ({
  __typename: "CardType",
  id,
  title,
  description,
  status,
});

export const boardMock = (cards, { cursor, nextCursor = null } = {}) => ({
  request: { query: GET_BOARD, variables: cursor ? { cursor } : {} },
  result: {
    data: {
      lanes,
      cardPage: {
        __typename: "CardPage",
        cards,
        nextCursor,
        hasNextPage: Boolean(nextCursor),
      },
    },
  },
});

export const renderWithApollo = (ui, mocks = []) =>
  render(
    <MockedProvider mocks={mocks} cache={createCache()}>
      {ui}
    </MockedProvider>
  );
