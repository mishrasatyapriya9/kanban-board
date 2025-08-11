import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./styles.css";

// Error Boundary Component
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (errorEvent) => {
      console.error("Global error caught:", errorEvent);
      setError(errorEvent.error || errorEvent);
      setHasError(true);
    };

    const handleUnhandledRejection = (event) => {
      console.error("Unhandled promise rejection:", event);
      setError(event.reason);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="error-boundary">
        <div className="error-content">
          <h1>⚠️ Something went wrong</h1>
          <p>An error occurred while using the application.</p>
          {error && (
            <details>
              <summary>Error Details</summary>
              <pre>{error.message || error.toString()}</pre>
            </details>
          )}
          <button 
            className="btn btn-primary"
            onClick={() => {
              setHasError(false);
              setError(null);
              window.location.reload();
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
};

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
const Header = ({ onClearBoard, onAddTestTicket, onCreate, searchQuery, onSearchChange, searchResults, onResultClick, onClearSearch }) => (
  <header className="header">
    <div className="header-left">
      <div className="logo">
        <span className="logo-icon">📋</span>
        <span className="logo-text">MyKanban Pro</span>
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
        <input 
          type="text" 
          placeholder="Search tickets..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={onClearSearch} aria-label="Clear search">×</button>
        )}
        {searchQuery && searchResults?.length > 0 && (
          <div className="search-results">
            {searchResults.map((t) => (
              <div key={t.id} className="search-result-item" onClick={() => onResultClick(t)}>
                <div className="result-title">#{t.id} — {t.title}</div>
                <div className="result-meta">
                  <span className="badge status">{t.status}</span>
                  <span className="badge priority">{t.priority}</span>
                  <span className="assignee">{t.assignedTo}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {searchQuery && searchResults?.length === 0 && (
          <div className="search-results empty">No results</div>
        )}
      </div>
    </div>
    <div className="header-right">
      <button className="btn btn-primary" onClick={() => onCreate("To Do")}>+ Create</button>
      <button className="btn btn-secondary" onClick={onAddTestTicket}>Add Test</button>
      <button className="btn btn-secondary" onClick={onClearBoard}>Clear Board</button>
      <div className="user-avatar">👤</div>
    </div>
  </header>
);

// Ticket Component
const Ticket = ({ ticket, onEdit, onDelete, onClick, dragEnabled, onEnableDrag }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: dragEnabled ? 'none' : 'auto',
    cursor: dragEnabled ? 'grab' : 'pointer',
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#dc3545";
      case "Medium": return "#ffc107";
      case "Low": return "#28a745";
      default: return "#6c757d";
    }
  };

  const clickTimerRef = useRef(null);

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    onEdit(ticket);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    onDelete(ticket.id, ticket.status);
  };

  const handleTicketClick = () => {
    if (dragEnabled) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    // Delay a bit to allow a possible double-click to cancel
    clickTimerRef.current = setTimeout(() => {
      onClick(ticket);
      clickTimerRef.current = null;
    }, 220);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (clickTimerRef.current) { clearTimeout(clickTimerRef.current); clickTimerRef.current = null; }
    onEnableDrag(ticket.id);
  };

  return (
    <div
      className="ticket"
      ref={setNodeRef}
      style={style}
      onClick={handleTicketClick}
      onDoubleClick={handleDoubleClick}
      data-id={ticket.id}
      data-status={ticket.status}
      data-drag-enabled={dragEnabled}
      {...attributes}
      {...listeners}
    >
      <div className="ticket-header">
        <div className="ticket-header-left">
          <span className="ticket-id">#{ticket.id}</span>
          <span 
            className="priority-badge"
            style={{ backgroundColor: getPriorityColor(ticket.priority) }}
          >
            {ticket.priority}
          </span>
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
    </div>
  );
};

// Column Component
const Column = ({ status, tickets, onEdit, onDelete, onTicketClick, onCreateTicket, dragEnabledId, setDragEnabledId }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case "To Do": return "📋";
      case "In Progress": return "🔄";
      case "Done": return "✅";
      default: return "📋";
    }
  };

  // Make the column a droppable area
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={`column ${isOver ? 'drag-over' : ''}`} data-status={status} data-column-type="kanban-column">
      <div className={`column-header ${isOver ? 'drag-over' : ''}`} data-status={status} data-column-type="kanban-column-header">
        <div className="column-title">
          <span className="status-icon">{getStatusIcon(status)}</span>
          <h2 data-status={status}>{status}</h2>
          <span className="ticket-count">{(tickets || []).length}</span>
        </div>
      </div>
      <div ref={setNodeRef} className={`column-content ${isOver ? 'drag-over' : ''}`} data-status={status} data-column-type="kanban-column-content">
      <SortableContext
          id={status}
          items={(tickets || []).filter(Boolean).map((ticket) => ticket.id)}
        strategy={verticalListSortingStrategy}
      >
          {(tickets || []).filter(Boolean).map((ticket) => (
            <Ticket
            key={ticket.id}
            ticket={ticket}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onTicketClick}
              dragEnabled={dragEnabledId === ticket.id}
              onEnableDrag={setDragEnabledId}
          />
        ))}
      </SortableContext>
        {(!tickets || tickets.length === 0) ? (
          <div className="empty-column" data-status={status} data-column-type="kanban-empty-column">
            <div className="empty-icon">📝</div>
            <p>No tickets</p>
          </div>
        ) : null}
        <div className="column-footer">
          <button className="btn-create" onClick={() => onCreateTicket(status)}>
            + Create ticket
          </button>
        </div>
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
    } else if (ticket && !isEditing) {
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        tentativeTime: "",
        priority: "Medium",
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
          <div className="ticket-detail-tags">
            <span className="ticket-id-large">#{ticket.id}</span>
            <span 
              className="priority-badge-large"
              style={{ backgroundColor: getPriorityColor(ticket.priority) }}
            >
              {ticket.priority}
            </span>
          </div>

          <div className="detail-row">
            <label>Title:</label>
            <div className="detail-value">{ticket.title}</div>
          </div>

          <div className="detail-row">
            <label>Description:</label>
            <div className="detail-value">{ticket.description}</div>
          </div>

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
              <span>{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '-'}</span>
            </div>
            <div className="detail-item">
              <label>Last Edited:</label>
              <span>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : '—'}</span>
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
  const [editingTicket, setEditingTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragEnabledId, setDragEnabledId] = useState(null);
  const [createStatus, setCreateStatus] = useState("To Do");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Shortcut: N to create new ticket
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.key === 'n' || e.key === 'N')) {
        const target = e.target;
        const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
        const editable = target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
        if (!editable) {
          e.preventDefault();
          setCreateStatus('To Do');
          setIsCreateModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Enhanced sensors for better drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // start on minimal movement after double-click
      },
    })
  );

  // Simplified collision detection that always works
  const simpleCollisionDetection = (args) => {
    return closestCenter(args);
  };

  useEffect(() => {
    saveToLocalStorage(columns);
  }, [columns]);

  const allTickets = useMemo(() => Object.values(columns).flat(), [columns]);
  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allTickets.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.assignedTo || '').toLowerCase().includes(q) ||
      (t.id || '').toString().includes(q)
    ).slice(0, 10);
  }, [allTickets, searchQuery]);

  const handleCreateTicket = (status) => {
    setCreateStatus(status);
    setIsCreateModalOpen(true);
    setDragEnabledId(null);
  };

  const handleEditTicket = (ticket) => {
    if (!ticket) return;
    setEditingTicket(ticket);
    setIsEditModalOpen(true);
    setDragEnabledId(null);
  };

  const handleTicketClick = (ticket) => {
    if (!ticket) return;
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
    setDragEnabledId(null);
  };

  const handleSaveTicket = (ticketData) => {
    if (!ticketData || !ticketData.title || !ticketData.assignedTo || !ticketData.tentativeTime) {
      return;
    }
    if (editingTicket) {
      setColumns((prev) => {
        const newColumns = { ...prev };
        newColumns[editingTicket.status] = newColumns[editingTicket.status].filter((t) => t.id !== editingTicket.id);
        const updatedTicket = { ...editingTicket, ...ticketData, updatedAt: new Date().toISOString() };
        const targetStatus = ticketData.status;
        newColumns[targetStatus] = [...(newColumns[targetStatus] || []), updatedTicket];
        return newColumns;
      });
      setEditingTicket(null);
      setIsEditModalOpen(false);
    } else {
      const now = new Date().toISOString();
      const newTicket = {
        id: Date.now().toString(),
        ...ticketData,
        status: createStatus || ticketData.status || "To Do",
        createdAt: now,
        updatedAt: now,
      };
      setColumns((prev) => ({
        ...prev,
        [newTicket.status]: [...(prev[newTicket.status] || []), newTicket],
      }));
      setIsCreateModalOpen(false);
    }
  };

  const handleDeleteTicket = (id, status) => {
    if (!id || !status) return;
    setColumns((prev) => ({
      ...prev,
      [status]: prev[status].filter((ticket) => ticket.id !== id),
    }));
  };

  const handleDragStart = (event) => {
    try {
      const { active } = event;
      const ticket = Object.values(columns).flat().find(t => t.id === active.id);
      setDraggedTicket(ticket);
      
      // Add visual feedback to the dragged element
      const draggedElement = document.querySelector(`[data-id="${active.id}"]`);
      if (draggedElement) {
        draggedElement.style.opacity = '0.5';
        draggedElement.style.transform = 'rotate(5deg)';
        draggedElement.style.zIndex = '1000';
      }
    } catch (error) {
      console.error('Error in handleDragStart:', error);
    }
  };

  const handleDragOver = (event) => {
    try {
      const { over } = event;
      if (!over || !over.id) return;
      
      // Visual highlighting is handled via useDroppable isOver state
      // Add additional visual feedback for drop zones
      const dropZone = document.querySelector(`[data-status="${over.id}"]`);
      if (dropZone) {
        dropZone.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        dropZone.style.border = '2px dashed #007bff';
      }
    } catch (error) {
      console.error('Error in handleDragOver:', error);
    }
  };

  const handleDragEnd = (event) => {
    try {
    const { active, over } = event;
      
      // Reset visual feedback
      if (active && active.id) {
        const draggedElement = document.querySelector(`[data-id="${active.id}"]`);
        if (draggedElement) {
          draggedElement.style.opacity = '';
          draggedElement.style.transform = '';
          draggedElement.style.zIndex = '';
        }
      }
      
      // Reset drop zone styling
      Object.keys(columns).forEach(status => {
        const dropZone = document.querySelector(`[data-status="${status}"]`);
        if (dropZone) {
          dropZone.style.backgroundColor = '';
          dropZone.style.border = '';
        }
      });
      
      setDraggedTicket(null);
      setDragEnabledId(null);
      
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

      const sourceStatus = active.data?.current?.sortable?.containerId;
      const destinationStatus = over.data?.current?.sortable?.containerId || (Object.keys(columns).includes(overId) ? overId : null);

    if (!sourceStatus || !destinationStatus) return;

    if (sourceStatus === destinationStatus) {
        const sourceItems = columns[sourceStatus] || [];
        const oldIndex = sourceItems.findIndex((t) => t.id === activeId);
        const newIndexRaw = sourceItems.findIndex((t) => t.id === overId);
        const newIndex = newIndexRaw === -1 ? sourceItems.length - 1 : newIndexRaw;
        if (oldIndex === -1) return;
        const updated = arrayMove(sourceItems, oldIndex, newIndex);
        setColumns({ ...columns, [sourceStatus]: updated });
        return;
      }

      // Move to different column and update status
      const sourceItems = [...(columns[sourceStatus] || [])];
      const destItems = [...(columns[destinationStatus] || [])];
      const movingIndex = sourceItems.findIndex((t) => t.id === activeId);
      if (movingIndex === -1) return;
      const [moving] = sourceItems.splice(movingIndex, 1);
      const updatedMoving = { ...moving, status: destinationStatus };
      destItems.push(updatedMoving);

      setColumns({
        ...columns,
        [sourceStatus]: sourceItems,
        [destinationStatus]: destItems,
      });
    } catch (error) {
      console.error('Error in handleDragEnd:', error);
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

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (query) {
      setSearchResults(Object.values(columns).flat().filter(ticket => 
        ticket.id.includes(query) ||
        ticket.title.includes(query) ||
        ticket.assignedTo.includes(query) ||
        ticket.status.includes(query) ||
        ticket.priority.includes(query)
      ));
    } else {
      setSearchResults([]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleResultClick = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <Header 
          onClearBoard={handleClearBoard} 
          onAddTestTicket={addTestTicket}
          onCreate={handleCreateTicket}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={filteredTickets}
          onResultClick={handleTicketClick}
          onClearSearch={() => setSearchQuery("")}
        />
        <main className="main-content">
          <div className="board-container">
        <DndContext
          sensors={sensors}
              collisionDetection={simpleCollisionDetection}
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
                    dragEnabledId={dragEnabledId}
                    setDragEnabledId={setDragEnabledId}
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
          ticket={{ status: createStatus }}
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
    </ErrorBoundary>
  );
};

export default App;
