package handlers

import (
        "encoding/json"
        "historical-events-backend/internal/database/repositories"
        "historical-events-backend/internal/models"
        "historical-events-backend/pkg/cache"
        "historical-events-backend/pkg/response"
        "net/http"
        "strconv"

        "github.com/gorilla/mux"
)

// TagHandler handles HTTP requests for tags
type TagHandler struct {
        tagRepo    *repositories.TagRepository
        eventCache *cache.EventCache
}

// NewTagHandler creates a new TagHandler
func NewTagHandler(tagRepo *repositories.TagRepository, eventCache *cache.EventCache) *TagHandler {
        return &TagHandler{
                tagRepo:    tagRepo,
                eventCache: eventCache,
        }
}

// GetAllTags handles GET /api/tags
func (h *TagHandler) GetAllTags(w http.ResponseWriter, r *http.Request) {
        tags, err := h.tagRepo.GetAllTags()
        if err != nil {
                response.InternalError(w, "Failed to fetch tags")
                return
        }

        response.Success(w, tags)
}

// GetTagByID handles GET /api/tags/{id}
func (h *TagHandler) GetTagByID(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        id, err := strconv.Atoi(vars["id"])
        if err != nil {
                response.BadRequest(w, "Invalid tag ID")
                return
        }

        tag, err := h.tagRepo.GetTagByID(id)
        if err != nil {
                response.NotFound(w, "Tag not found")
                return
        }

        response.Success(w, tag)
}

// CreateTag handles POST /api/tags
func (h *TagHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
        var req models.CreateTagRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                response.BadRequest(w, "Invalid JSON payload")
                return
        }

        // Convert request to tag model
        tag := req.ToTag()

        // Create tag in database
        createdTag, err := h.tagRepo.CreateTag(tag)
        if err != nil {
                response.InternalError(w, "Failed to create tag")
                return
        }

        response.Created(w, createdTag, "Tag created successfully")
}

// UpdateTag handles PUT /api/tags/{id}
func (h *TagHandler) UpdateTag(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        id, err := strconv.Atoi(vars["id"])
        if err != nil {
                response.BadRequest(w, "Invalid tag ID")
                return
        }

        var req models.UpdateTagRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                response.BadRequest(w, "Invalid JSON payload")
                return
        }

        // Get existing tag first
        existingTag, err := h.tagRepo.GetTagByID(id)
        if err != nil {
                response.NotFound(w, "Tag not found")
                return
        }

        // Update fields that are provided
        if req.Name != "" {
                existingTag.Name = req.Name
        }
        if req.Description != "" {
                existingTag.Description = req.Description
        }
        if req.Color != "" {
                existingTag.Color = req.Color
        }
        if req.ClearBorderColor {
                existingTag.BorderColor = nil
        } else if req.BorderColor != nil {
                existingTag.BorderColor = req.BorderColor
        }
        if req.ClearEmoji {
                existingTag.Emoji = nil
        } else if req.Emoji != nil {
                existingTag.Emoji = req.Emoji
        }
        if req.KeyColor != nil {
                existingTag.KeyColor = *req.KeyColor
        }
        if req.Weight != nil {
                existingTag.Weight = *req.Weight
        }

        // Update tag in database
        updatedTag, err := h.tagRepo.UpdateTag(id, existingTag)
        if err != nil {
                response.InternalError(w, "Failed to update tag")
                return
        }

        h.eventCache.Invalidate()
        response.Success(w, updatedTag)
}

// DeleteTag handles DELETE /api/tags/{id}
func (h *TagHandler) DeleteTag(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        id, err := strconv.Atoi(vars["id"])
        if err != nil {
                response.BadRequest(w, "Invalid tag ID")
                return
        }

        err = h.tagRepo.DeleteTag(id)
        if err != nil {
                response.InternalError(w, "Failed to delete tag")
                return
        }

        h.eventCache.Invalidate()
        response.Success(w, map[string]string{"message": "Tag deleted successfully"})
}

// CleanupUnusedTags handles DELETE /api/tags/cleanup-unused — deletes every
// tag that isn't attached to any event, for the admin "cleanup" button.
func (h *TagHandler) CleanupUnusedTags(w http.ResponseWriter, r *http.Request) {
        deletedCount, err := h.tagRepo.DeleteUnusedTags()
        if err != nil {
                response.InternalError(w, "Failed to clean up unused tags")
                return
        }

        h.eventCache.Invalidate()
        response.Success(w, map[string]int{"deleted_count": deletedCount})
}

// AddTagToEvent handles POST /api/events/{event_id}/tags/{tag_id}
func (h *TagHandler) AddTagToEvent(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        eventID, err := strconv.Atoi(vars["event_id"])
        if err != nil {
                response.BadRequest(w, "Invalid event ID")
                return
        }

        tagID, err := strconv.Atoi(vars["tag_id"])
        if err != nil {
                response.BadRequest(w, "Invalid tag ID")
                return
        }

        err = h.tagRepo.AddTagToEvent(eventID, tagID)
        if err != nil {
                response.InternalError(w, "Failed to add tag to event")
                return
        }

        h.eventCache.Invalidate()
        response.Success(w, map[string]string{"message": "Tag added to event successfully"})
}

// RemoveTagFromEvent handles DELETE /api/events/{event_id}/tags/{tag_id}
func (h *TagHandler) RemoveTagFromEvent(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        eventID, err := strconv.Atoi(vars["event_id"])
        if err != nil {
                response.BadRequest(w, "Invalid event ID")
                return
        }

        tagID, err := strconv.Atoi(vars["tag_id"])
        if err != nil {
                response.BadRequest(w, "Invalid tag ID")
                return
        }

        err = h.tagRepo.RemoveTagFromEvent(eventID, tagID)
        if err != nil {
                response.InternalError(w, "Failed to remove tag from event")
                return
        }

        h.eventCache.Invalidate()
        response.Success(w, map[string]string{"message": "Tag removed from event successfully"})
}

// SetEventTags handles PUT /api/events/{event_id}/tags
func (h *TagHandler) SetEventTags(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        eventID, err := strconv.Atoi(vars["event_id"])
        if err != nil {
                response.BadRequest(w, "Invalid event ID")
                return
        }

        var req struct {
                TagIDs []int `json:"tag_ids"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                response.BadRequest(w, "Invalid JSON payload")
                return
        }

        // Allow unlimited tags per event (display will be limited on frontend)

        err = h.tagRepo.SetEventTags(eventID, req.TagIDs)
        if err != nil {
                response.InternalError(w, "Failed to set event tags")
                return
        }

        h.eventCache.Invalidate()
        response.Success(w, map[string]string{"message": "Event tags updated successfully"})
}