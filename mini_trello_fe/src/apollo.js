import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

import { GRAPHQL_URL } from "./config";

/**
 * Cards are normalised by `id`, so a mutation returning a card updates the
 * board without a refetch. Pages of `cardPage` are stitched into one list: a
 * request with a cursor appends, a request without one starts over.
 */
export const createCache = () =>
  new InMemoryCache({
    typePolicies: {
      CardType: { keyFields: ["id"] },
      LaneType: { keyFields: ["id"] },
      Query: {
        fields: {
          cardPage: {
            keyArgs: false,
            merge(existing, incoming, { args }) {
              if (!existing || !args?.cursor) return incoming;
              return { ...incoming, cards: [...existing.cards, ...incoming.cards] };
            },
          },
        },
      },
    },
  });

const client = new ApolloClient({
  link: new HttpLink({ uri: GRAPHQL_URL }),
  cache: createCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});

export default client;
