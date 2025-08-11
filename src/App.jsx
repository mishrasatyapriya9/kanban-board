import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./styles.css";

// Empty initial columns - no tickets
const initialColumns = {
  "To Do": [],
  "In Progress": [],
  Done: [],
};

const loadFromLocalStorage = () => {
  const saved = localStorage.getItem("kanban-tickets");
  return saved ? JSON.parse(saved) : initialColumns;
};

const saveToLocalStorage = (columns) => {
  localStorage.setItem("kanban-tickets", JSON.stringify(columns));
};

// Clear localStorage to start fresh
const clearLocalStorage = () => {
  localStorage.removeItem("kanban-tickets");
};

// Header Component
const Header = ({ onClearBoard, onAddTestTicket }) => (
  <header className="header">
    <div className="header-left">
      <div className="logo">
        <span className="logo-icon">📋</span>
        <span className="logo-text">Kanban Board</span>
      </div>
      <div className="project-selector">
        <span className="project-icon">🚀</span>
        <span className="project-name">My Scrum Project</span>
        <span className="project-arrow">▼</span>
      </div>
    </div>
    <div className="header-center">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search tickets..." />
      </div>
    </div>
    <div className="header-right">
      <button className="btn btn-primary">+ Create</button>
      <button className="btn btn-secondary" onClick={onAddTestTicket}>Add Test</button>
      <button className="btn btn-secondary" onClick={onClearBoard}>Clear Board</button>
      <div className="user-avatar">👤</div>
    </div>
  </header>
);

// Ticket Component
const Ticket = ({ ticket, onEdit, onDelete, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#dc3545";
      case "Medium": return "#ffc107";
      case "Low": return "#28a745";
      default: return "#6c757d";
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    console.log("Edit button clicked for ticket:", ticket.id); // Debug log
    onEdit(ticket);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    console.log("Delete button clicked for ticket:", ticket.id); // Debug log
    onDelete(ticket.id, ticket.status);
  };

  const handleTicketClick = (e) => {
    // Don't trigger if clicking on buttons
    if (e.target.closest('.btn-edit') || e.target.closest('.btn-delete')) {
      return;
    }
    onClick(ticket);
  };

  return (
    <div
      className="ticket"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleTicketClick}
      data-id={ticket.id}
      data-status={ticket.status}
    >
      <div className="ticket-header">
        <span className="ticket-id">#{ticket.id}</span>
        <span 
          className="priority-badge"
          style={{ backgroundColor: getPriorityColor(ticket.priority) }}
        >
          {ticket.priority}
        </span>
      </div>
      <h3 className="ticket-title">{ticket.title}</h3>
      <p className="ticket-description">{ticket.description}</p>
      <div className="ticket-meta">
        <div className="assigned-to">
          <span className="user-icon">👤</span>
          <span>{ticket.assignedTo}</span>
        </div>
        <div className="time-estimate">
          <span className="clock-icon">⏱️</span>
          <span>{ticket.tentativeTime}h</span>
        </div>
      </div>
      <div className="ticket-actions">
        <button 
          className="btn-edit"
          onClick={handleEditClick}
          type="button"
        >
          ✏️
        </button>
        <button 
          className="btn-delete"
          onClick={handleDeleteClick}
          type="button"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// Column Component
const Column = ({ status, tickets, onEdit, onDelete, onTicketClick, onCreateTicket }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case "To Do": return "📋";
      case "In Progress": return "🔄";
      case "Done": return "✅";
      default: return "📋";
    }
  };

  return (
    <div className="column" data-status={status} data-column-type="kanban-column">
      <div className="column-header" data-status={status} data-column-type="kanban-column-header">
        <div className="column-title">
          <span className="status-icon">{getStatusIcon(status)}</span>
          <h2 data-status={status}>{status}</h2>
          <span className="ticket-count">{tickets.length}</span>
        </div>
      </div>
      <div className="column-content" data-status={status} data-column-type="kanban-column-content">
        <SortableContext
          items={tickets.map((ticket) => ticket.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <Ticket
              key={ticket.id}
              ticket={ticket}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onTicketClick}
            />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <div className="empty-column" data-status={status} data-column-type="kanban-empty-column">
            <div className="empty-icon">📝</div>
            <p>No tickets</p>
            <button className="btn-create" onClick={() => onCreateTicket(status)}>
              + Create ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Create/Edit Ticket Modal
const TicketModal = ({ 
  isOpen, 
  onClose, 
  ticket, 
  onSave, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    tentativeTime: "",
    priority: "Medium",
    status: "To Do"
  });

  useEffect(() => {
    if (ticket && isEditing) {
      setFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        assignedTo: ticket.assignedTo || "",
        tentativeTime: ticket.tentativeTime || "",
        priority: ticket.priority || "Medium",
        status: ticket.status || "To Do"
      });
    } else {
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        tentativeTime: "",
        priority: "Medium",
        status: "To Do"
      });
    }
  }, [ticket, isEditing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.assignedTo.trim() || !formData.tentativeTime) {
      return;
    }
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? "Edit Ticket" : "Create New Ticket"}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter ticket title"
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter ticket description"
              rows="3"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assigned To *</label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                placeholder="Enter assignee name"
                required
              />
            </div>
            <div className="form-group">
              <label>Tentative Time (hours) *</label>
              <input
                type="number"
                value={formData.tentativeTime}
                onChange={(e) => setFormData({ ...formData, tentativeTime: parseInt(e.target.value) || "" })}
                placeholder="0"
                min="1"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ticket Detail Modal
const TicketDetailModal = ({ isOpen, onClose, ticket }) => {
  if (!isOpen || !ticket) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#dc3545";
      case "Medium": return "#ffc107";
      case "Low": return "#28a745";
      default: return "#6c757d";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ticket Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ticket-detail-content">
          <div className="ticket-detail-header">
            <span className="ticket-id-large">#{ticket.id}</span>
            <span 
              className="priority-badge-large"
              style={{ backgroundColor: getPriorityColor(ticket.priority) }}
            >
              {ticket.priority}
            </span>
          </div>
          <h3 className="ticket-title-large">{ticket.title}</h3>
          <p className="ticket-description-large">{ticket.description}</p>
          
          <div className="ticket-detail-grid">
            <div className="detail-item">
              <label>Status:</label>
              <span className="status-badge">{ticket.status}</span>
            </div>
            <div className="detail-item">
              <label>Assigned To:</label>
              <span>{ticket.assignedTo}</span>
            </div>
            <div className="detail-item">
              <label>Estimated Time:</label>
              <span>{ticket.tentativeTime} hours</span>
            </div>
            <div className="detail-item">
              <label>Created:</label>
              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [columns, setColumns] = useState(loadFromLocalStorage());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [createStatus, setCreateStatus] = useState("To Do");
  const [draggedTicket, setDraggedTicket] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));

  // Custom collision detection for better accuracy
  const customCollisionDetection = (args) => {
    // First, let's see what intersections the default collision detection algorithm finds
    const pointerIntersections = closestCorners(args);
    
    if (pointerIntersections.length > 0) {
      return pointerIntersections;
    }
    
    // If no intersections found, try to find the closest column
    const { active, droppableRects, droppableContainers } = args;
    
    if (active && droppableContainers.length > 0) {
      // Find the closest column to the pointer
      let closestContainer = null;
      let minDistance = Infinity;
      
      droppableContainers.forEach((container) => {
        const rect = droppableRects.get(container.id);
        if (rect) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.sqrt(
            Math.pow(centerX - args.active.rect.current.translated.left, 2) +
            Math.pow(centerY - args.active.rect.current.translated.top, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestContainer = container;
          }
        }
      });
      
      if (closestContainer) {
        return [closestContainer];
      }
    }
    
    return [];
  };

  useEffect(() => {
    saveToLocalStorage(columns);
  }, [columns]);

  const handleCreateTicket = (status) => {
    setCreateStatus(status);
    setIsCreateModalOpen(true);
  };

  const handleEditTicket = (ticket) => {
    console.log("Edit ticket called with:", ticket); // Debug log
    if (!ticket) {
      console.error("No ticket provided to edit");
      return;
    }
    setEditingTicket(ticket);
    setIsEditModalOpen(true);
  };

  const handleTicketClick = (ticket) => {
    console.log("Ticket clicked:", ticket); // Debug log
    if (!ticket) {
      console.error("No ticket provided to view");
      return;
    }
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleSaveTicket = (ticketData) => {
    console.log("Save ticket called with:", ticketData); // Debug log
    if (!ticketData || !ticketData.title || !ticketData.assignedTo || !ticketData.tentativeTime) {
      console.error("Invalid ticket data:", ticketData);
      return;
    }
    
    if (editingTicket) {
      // Update existing ticket
      setColumns((prev) => {
        const newColumns = { ...prev };
        // Remove from old status
        newColumns[editingTicket.status] = newColumns[editingTicket.status].filter(
          (t) => t.id !== editingTicket.id
        );
        // Add to new status
        const updatedTicket = { ...editingTicket, ...ticketData };
        newColumns[ticketData.status] = [...(newColumns[ticketData.status] || []), updatedTicket];
        return newColumns;
      });
      setEditingTicket(null);
      setIsEditModalOpen(false);
    } else {
      // Create new ticket
      const newTicket = {
        id: Date.now().toString(),
        ...ticketData,
        createdAt: new Date().toISOString(),
      };
      setColumns((prev) => ({
        ...prev,
        [ticketData.status]: [...(prev[ticketData.status] || []), newTicket],
      }));
      setIsCreateModalOpen(false);
    }
  };

  const handleDeleteTicket = (id, status) => {
    console.log("Delete ticket called with:", id, status); // Debug log
    if (!id || !status) {
      console.error("Invalid delete parameters:", { id, status });
      return;
    }
    setColumns((prev) => ({
      ...prev,
      [status]: prev[status].filter((ticket) => ticket.id !== id),
    }));
  };

  const handleDragStart = (event) => {
    const { active } = event;
    console.log("Drag start:", active.id);
    
    // Find the ticket being dragged
    const ticket = Object.values(columns).flat().find(t => t.id === active.id);
    setDraggedTicket(ticket);
    
    // Add visual feedback to the dragged element
    const draggedElement = document.querySelector(`[data-id="${active.id}"]`);
    if (draggedElement) {
      draggedElement.classList.add('dragging');
    }
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) return;

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Add drag-over class to the target column
    const targetElement = over.target;
    let columnElement = null;

    // Find the column element
    if (targetElement.dataset && targetElement.dataset.status) {
      columnElement = targetElement.closest('.column');
    } else {
      columnElement = targetElement.closest('.column');
    }

    if (columnElement) {
      columnElement.classList.add('drag-over');
      const header = columnElement.querySelector('.column-header');
      const content = columnElement.querySelector('.column-content');
      if (header) header.classList.add('drag-over');
      if (content) content.classList.add('drag-over');
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    console.log("Drag end event:", { active, over }); // Debug log
    
    // Clear dragged ticket state
    setDraggedTicket(null);
    
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Remove dragging class from the dragged element
    const draggedElement = document.querySelector(`[data-id="${active.id}"]`);
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
    }
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    console.log("Active ID:", activeId, "Over ID:", overId); // Debug log

    // Find source column
    const sourceStatus = Object.keys(columns).find((status) =>
      columns[status].some((ticket) => ticket.id === activeId)
    );
    
    console.log("Source status:", sourceStatus); // Debug log
    
    if (!sourceStatus) return;

    // Find destination column - improved detection
    let destinationStatus = null;
    
    // Method 1: Check if dropping directly on a column status
    if (Object.keys(columns).includes(overId)) {
      destinationStatus = overId;
    } else {
      // Method 2: Check if dropping on a ticket in another column
      destinationStatus = Object.keys(columns).find((status) =>
        columns[status].some((ticket) => ticket.id === overId)
      );
      
      // Method 3: Check if dropping on column content or header using DOM traversal
      if (!destinationStatus) {
        const targetElement = over.target;
        console.log("Target element:", targetElement); // Debug log
        
        // Traverse up the DOM to find column data
        let currentElement = targetElement;
        while (currentElement && !destinationStatus) {
          if (currentElement.dataset && currentElement.dataset.status) {
            destinationStatus = currentElement.dataset.status;
            console.log("Found status from dataset:", destinationStatus); // Debug log
            break;
          }
          currentElement = currentElement.parentElement;
        }
        
        // Method 4: Check if dropping on empty column area
        if (!destinationStatus) {
          const columnElement = targetElement.closest('.column');
          if (columnElement) {
            destinationStatus = columnElement.dataset.status;
            console.log("Found status from column element:", destinationStatus); // Debug log
          }
        }
      }
    }

    console.log("Final destination status:", destinationStatus); // Debug log
    
    if (!destinationStatus) {
      console.log("Could not determine destination status"); // Debug log
      return;
    }

    const sourceTickets = [...(columns[sourceStatus] || [])];
    const ticket = sourceTickets.find((t) => t.id === activeId);

    if (!ticket) return;

    if (sourceStatus === destinationStatus) {
      // Reorder within the same column
      const newTickets = [...sourceTickets];
      const oldIndex = sourceTickets.findIndex((t) => t.id === activeId);
      const newIndex = sourceTickets.findIndex((t) => t.id === overId);
      
      if (newIndex === -1) {
        // If dropping on column header, add to end
        newTickets.splice(oldIndex, 1);
        newTickets.push(ticket);
      } else {
        // Reorder within column
        newTickets.splice(oldIndex, 1);
        newTickets.splice(newIndex, 0, ticket);
      }
      
      setColumns({ ...columns, [sourceStatus]: newTickets });
    } else {
      // Move to a different column
      const sourceTickets = [...(columns[sourceStatus] || [])];
      const destTickets = [...(columns[destinationStatus] || [])];
      const ticketIndex = sourceTickets.findIndex((t) => t.id === activeId);
      sourceTickets.splice(ticketIndex, 1);
      destTickets.push({ ...ticket, status: destinationStatus });
      setColumns({
        ...columns,
        [sourceStatus]: sourceTickets,
        [destinationStatus]: destTickets,
      });
    }
  };

  const handleClearBoard = () => {
    setColumns(initialColumns);
    saveToLocalStorage(initialColumns);
  };

  const addTestTicket = () => {
    const testTicket = {
      id: Date.now().toString(),
      title: "Test Ticket",
      description: "This is a test ticket to verify functionality",
      assignedTo: "Test User",
      tentativeTime: 2,
      priority: "Medium",
      status: "To Do",
      createdAt: new Date().toISOString(),
    };
    setColumns((prev) => ({
      ...prev,
      "To Do": [...(prev["To Do"] || []), testTicket],
    }));
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTicket(null);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTicket(null);
  };

  return (
    <div className="app">
      <Header onClearBoard={handleClearBoard} onAddTestTicket={addTestTicket} />
      <main className="main-content">
        <div className="board-container">
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
          >
            <div className="board">
              {Object.entries(columns).map(([status, tickets]) => (
                <Column
                  key={status}
                  status={status}
                  tickets={tickets || []}
                  onEdit={handleEditTicket}
                  onDelete={handleDeleteTicket}
                  onTicketClick={handleTicketClick}
                  onCreateTicket={handleCreateTicket}
                />
              ))}
            </div>
            
            <DragOverlay>
              {draggedTicket ? (
                <div className="ticket drag-overlay">
                  <div className="ticket-header">
                    <span className="ticket-id">#{draggedTicket.id}</span>
                    <span 
                      className="priority-badge"
                      style={{ 
                        backgroundColor: (() => {
                          switch (draggedTicket.priority) {
                            case "High": return "#dc3545";
                            case "Medium": return "#ffc107";
                            case "Low": return "#28a745";
                            default: return "#6c757d";
                          }
                        })()
                      }}
                    >
                      {draggedTicket.priority}
                    </span>
                  </div>
                  <h3 className="ticket-title">{draggedTicket.title}</h3>
                  <p className="ticket-description">{draggedTicket.description}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </main>

      {/* Create Ticket Modal */}
      <TicketModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        ticket={null}
        onSave={handleSaveTicket}
        isEditing={false}
      />

      {/* Edit Ticket Modal */}
      <TicketModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        ticket={editingTicket}
        onSave={handleSaveTicket}
        isEditing={true}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        ticket={selectedTicket}
      />
    </div>
  );
};

export default App;
