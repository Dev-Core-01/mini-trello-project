import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Board } from "../Pages/Board";
import { DELETE_CARD } from "../graphql/mutations";
import { GET_BOARD } from "../graphql/queries";
import { boardMock, card, renderWithApollo } from "../testUtils";

const CARDS = [
  card("1", "Write the spec", "todo", "One pager"),
  card("2", "Build it", "in-progress"),
  card("3", "Ship it", "done"),
  card("4", "Review the spec", "todo"),
];

describe("Board", () => {
  it("shows a loading state before the board arrives", () => {
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    expect(screen.getByText("Fetching your cards…")).toBeInTheDocument();
  });

  it("renders every lane returned by the server", async () => {
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    expect(await screen.findByRole("region", { name: "To Do" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Done" })).toBeInTheDocument();
  });

  it("puts each card in the lane matching its status", async () => {
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    const todo = await screen.findByRole("region", { name: "To Do" });

    expect(todo).toHaveTextContent("Write the spec");
    expect(todo).toHaveTextContent("Review the spec");
    expect(todo).not.toHaveTextContent("Ship it");
  });

  it("shows the number of cards in each lane", async () => {
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    const todo = await screen.findByRole("region", { name: "To Do" });

    expect(todo).toHaveTextContent("2 cards");
  });

  it("summarises the board in the header", async () => {
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    expect(await screen.findByText("4 cards across 3 lanes")).toBeInTheDocument();
  });

  it("shows a placeholder in an empty lane", async () => {
    renderWithApollo(<Board />, [boardMock([card("1", "Only card", "todo")])]);

    await screen.findByRole("region", { name: "Done" });

    expect(screen.getAllByText("Drop a card here")).toHaveLength(2);
  });

  it("renders a card description when there is one", async () => {
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    expect(await screen.findByText("One pager")).toBeInTheDocument();
  });

  it("shows an actionable error when the API cannot be reached", async () => {
    const failing = {
      request: { query: GET_BOARD },
      error: new Error("Failed to fetch"),
    };

    renderWithApollo(<Board />, [failing]);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the API");
    expect(screen.getByText(/VITE_GRAPHQL_URL/)).toBeInTheDocument();
  });

  it("opens an empty form from the Add card button", async () => {
    const user = userEvent.setup();
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    await screen.findByRole("region", { name: "To Do" });
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(await screen.findByText("Add a card")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("");
  });

  it("opens the form pre-filled when editing a card", async () => {
    const user = userEvent.setup();
    renderWithApollo(<Board />, [boardMock(CARDS)]);

    await screen.findByRole("region", { name: "To Do" });
    await user.click(screen.getByRole("button", { name: "Edit Write the spec" }));

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Write the spec"));
    expect(screen.getByLabelText("Description")).toHaveValue("One pager");
    expect(screen.getByText("Edit card")).toBeInTheDocument();
  });
  it("invites the first card on an empty board", async () => {
    renderWithApollo(<Board />, [boardMock([])]);

    expect(await screen.findByText(/Nothing on the board yet/)).toBeInTheDocument();
  });

  it("uses the singular for a single card", async () => {
    renderWithApollo(<Board />, [boardMock([card("1", "Only card", "todo")])]);

    expect(await screen.findByText("1 card across 3 lanes")).toBeInTheDocument();
  });

  it("keeps loading pages until the whole board is on screen", async () => {
    const firstPage = [card("1", "Write the spec", "todo"), card("2", "Build it", "in-progress")];
    const secondPage = [card("3", "Ship it", "done")];

    renderWithApollo(<Board />, [
      boardMock(firstPage, { nextCursor: "page-2" }),
      boardMock(secondPage, { cursor: "page-2" }),
    ]);

    expect(await screen.findByText("3 cards across 3 lanes")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Done" })).toHaveTextContent("Ship it");
  });

  it("explains a failed delete instead of failing silently", async () => {
    const user = userEvent.setup();
    const failingDelete = {
      request: { query: DELETE_CARD, variables: { id: "1" } },
      error: new Error("Network down"),
    };
    renderWithApollo(<Board />, [boardMock(CARDS), failingDelete]);

    await screen.findByRole("region", { name: "To Do" });
    await user.click(screen.getByRole("button", { name: "Delete Write the spec" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not delete the card: Network down"
    );
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
