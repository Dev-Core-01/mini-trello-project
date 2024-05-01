import { ApolloProvider } from "@apollo/client";

import client from "./apollo";
import { Board } from "./Pages/Board";

const App = () => (
  <ApolloProvider client={client}>
    <Board />
  </ApolloProvider>
);

export default App;
