import { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";

import { Lane } from "../Components/Lane";
import { TicketFormModal } from "../Components/TicketFormModal";
import { useBoard } from "../hooks/useBoard";
import "./Board.css";

const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export const Board = () => {
  const { lanes, cardCount, loading, error, createCard, updateCard, deleteCard, moveCard } =
    useBoard();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  // A failed move is rolled back by Apollo (the optimistic update is
  // discarded), but the user still needs to know why the card jumped back.
  const reportFailure = (action) => (failure) =>
    setNotice(`Could not ${action}: ${failure.message}`);

  const removeCard = (id) => {
    setNotice(null);
    deleteCard(id).catch(reportFailure("delete the card"));
  };

  const openAdd = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = (draft) =>
    editing
      ? updateCard({ id: editing.id, ...draft })
      : createCard({ ...draft, status: lanes[0]?.id });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    // Dropped outside a lane, or back where it started.
    if (!destination || destination.droppableId === source.droppableId) return;
    setNotice(null);
    moveCard(draggableId, destination.droppableId).catch(reportFailure("move the card"));
  };

  const summary =
    cardCount === 0
      ? "Nothing on the board yet. Add the first card to get started."
      : `${plural(cardCount, "card")} across ${plural(lanes.length, "lane")}`;

  return (
    <main className="board">
      <header className="board__header">
        <div>
          <p className="board__brand">Laneway</p>
          <h1 className="board__title">Team board</h1>
          <p className="board__subtitle">{loading ? "Loading board…" : summary}</p>
        </div>
        <button type="button" className="button" onClick={openAdd}>
          Add card
        </button>
      </header>

      {error ? (
        <div className="board__state board__state--error" role="alert">
          <h2>Could not reach the API</h2>
          <p>{error.message}</p>
          <p className="board__state-hint">
            Check that the backend is running and that VITE_GRAPHQL_URL points at it.
          </p>
        </div>
      ) : null}

      {notice ? (
        <div className="board__notice" role="alert">
          <p>{notice}</p>
          <button type="button" className="button button--ghost" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {loading && !error ? (
        <div className="board__state">
          <p>Fetching your cards…</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="board__lanes">
            {lanes.map((lane) => (
              <Lane key={lane.id} lane={lane} onEdit={openEdit} onDelete={removeCard} />
            ))}
          </div>
        </DragDropContext>
      ) : null}

      {isModalOpen ? (
        <TicketFormModal card={editing} onSubmit={handleSubmit} onClose={closeModal} />
      ) : null}
    </main>
  );
};
