import { Droppable } from "@hello-pangea/dnd";

import { CardTile } from "./CardTile";

export const Lane = ({ lane, onEdit, onDelete }) => (
  <Droppable droppableId={lane.id}>
    {(provided, snapshot) => (
      <section
        className={`lane${snapshot.isDraggingOver ? " lane--active" : ""}`}
        data-position={lane.position}
        aria-label={lane.title}
      >
        <header className="lane__header">
          <h2 className="lane__title">{lane.title}</h2>
          <span className="lane__count">
            {lane.cards.length}
            <span className="visually-hidden"> {lane.cards.length === 1 ? "card" : "cards"}</span>
          </span>
        </header>

        <div className="lane__cards" ref={provided.innerRef} {...provided.droppableProps}>
          {lane.cards.map((card, index) => (
            <CardTile
              key={card.id}
              card={card}
              index={index}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {provided.placeholder}
          {lane.cards.length === 0 ? (
            <p className="lane__empty">Drop a card here</p>
          ) : null}
        </div>
      </section>
    )}
  </Droppable>
);
