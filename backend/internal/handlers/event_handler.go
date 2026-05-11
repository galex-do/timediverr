package handlers

import (
        "encoding/json"
        "fmt"
        "historical-events-backend/internal/database/repositories"
        "historical-events-backend/internal/models"
        "historical-events-backend/pkg/cache"
        "historical-events-backend/pkg/metrics"
        "historical-events-backend/pkg/response"
        "log"
        "math/rand"
        "net/http"
        "strconv"
        "strings"
        "time"

        "github.com/gorilla/mux"
)

// EventHandler handles HTTP requests for events
type EventHandler struct {
        eventRepo   *repositories.EventRepository
        tagRepo     *repositories.TagRepository
        datasetRepo *repositories.DatasetRepository
        eventCache  *cache.EventCache
}

// NewEventHandler creates a new event handler
func NewEventHandler(eventRepo *repositories.EventRepository, tagRepo *repositories.TagRepository, datasetRepo *repositories.DatasetRepository, eventCache *cache.EventCache) *EventHandler {
        return &EventHandler{
                eventRepo:   eventRepo,
                tagRepo:     tagRepo,
                datasetRepo: datasetRepo,
                eventCache:  eventCache,
        }
}

// GetAllEvents handles GET /api/events with optional pagination and locale support
func (h *EventHandler) GetAllEvents(w http.ResponseWriter, r *http.Request) {
        query := r.URL.Query()
        
        // Get locale parameter (default to "en")
        locale := query.Get("locale")
        if locale == "" {
                locale = "en"
        }
        
        // Check if pagination parameters are provided
        pageStr := query.Get("page")
        limitStr := query.Get("limit")
        sortField := query.Get("sort")
        sortDir := query.Get("order")
        
        // If pagination parameters exist, use paginated query
        if pageStr != "" || limitStr != "" {
                page, err := strconv.Atoi(pageStr)
                if err != nil || page < 1 {
                        page = 1
                }
                
                limit, err := strconv.Atoi(limitStr)
                if err != nil || limit < 1 {
                        limit = 10 // Default page size
                }
                
                // Validate limit (max 100 to prevent abuse)
                if limit > 100 {
                        limit = 100
                }
                
                // Set default sorting if not provided
                if sortField == "" {
                        sortField = "date"
                }
                if sortDir == "" {
                        sortDir = "asc"
                }
                
                events, total, err := h.eventRepo.GetPaginatedWithSort(page, limit, sortField, sortDir)
                if err != nil {
                        log.Printf("Error fetching paginated events: %v", err)
                        response.InternalError(w, "Failed to fetch events")
                        return
                }
                
                // Populate legacy fields based on locale
                for i := range events {
                        events[i].PopulateLegacyFields(locale)
                }
                
                totalPages := (total + limit - 1) / limit // Ceiling division
                
                paginatedResponse := map[string]interface{}{
                        "events": events,
                        "pagination": map[string]interface{}{
                                "current_page": page,
                                "page_size":    limit,
                                "total_items":  total,
                                "total_pages":  totalPages,
                        },
                }
                
                response.Success(w, paginatedResponse)
                return
        }
        
        // Non-paginated path: serve from in-memory cache when possible.
        // Browser-level HTTP caching is intentionally disabled — performance is handled
        // by the Go in-memory cache (60s) and the client localStorage cache (5 min).
        // Allowing the browser to cache would cause stale data after admin edits.
        w.Header().Set("Cache-Control", "no-store")

        if cached, ok := h.eventCache.Get(locale); ok {
                w.Header().Set("Content-Type", "application/json")
                w.Header().Set("X-Cache", "HIT")
                w.WriteHeader(http.StatusOK)
                w.Write(cached)
                return
        }

        events, err := h.eventRepo.GetAll()
        if err != nil {
                log.Printf("Error fetching events: %v", err)
                response.InternalError(w, "Failed to fetch events")
                return
        }

        for i := range events {
                events[i].PopulateLegacyFields(locale)
        }

        payload := struct {
                Data []models.HistoricalEvent `json:"data"`
        }{Data: events}

        encoded, err := json.Marshal(payload)
        if err != nil {
                log.Printf("Error encoding events: %v", err)
                response.InternalError(w, "Failed to encode events")
                return
        }

        h.eventCache.Set(locale, encoded)

        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("X-Cache", "MISS")
        w.WriteHeader(http.StatusOK)
        w.Write(encoded)
}

// GetEventByID handles GET /api/events/{id} with locale support
func (h *EventHandler) GetEventByID(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        idStr := vars["id"]
        
        id, err := strconv.Atoi(idStr)
        if err != nil {
                response.BadRequest(w, "Invalid event ID")
                return
        }
        
        // Get locale parameter (default to "en")
        locale := r.URL.Query().Get("locale")
        if locale == "" {
                locale = "en"
        }
        
        event, err := h.eventRepo.GetByID(id)
        if err != nil {
                log.Printf("Error fetching event by ID %d: %v", id, err)
                response.NotFound(w, "Event not found")
                return
        }
        
        // Populate legacy fields based on locale
        event.PopulateLegacyFields(locale)
        
        response.Success(w, event)
}

// CreateEvent handles POST /api/events
func (h *EventHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
        var req models.CreateEventRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                response.BadRequest(w, "Invalid JSON format")
                return
        }
        
        // Validate coordinates
        if err := h.eventRepo.ValidateCoordinates(req.Latitude, req.Longitude); err != nil {
                response.BadRequest(w, err.Error())
                return
        }
        
        // Get current user from context
        user := getUserFromContext(r.Context())
        if user == nil {
                response.BadRequest(w, "User not found in context")
                return
        }
        
        // Convert request to event model
        event, err := req.ToHistoricalEvent(user.ID)
        if err != nil {
                response.BadRequest(w, err.Error())
                return
        }
        
        // Create event
        createdEvent, err := h.eventRepo.Create(event)
        if err != nil {
                log.Printf("Error creating event: %v", err)
                response.InternalError(w, "Failed to create event")
                return
        }
        
        // Mark dataset as modified if event has a dataset
        if createdEvent.DatasetID != nil && *createdEvent.DatasetID > 0 {
                if err := h.datasetRepo.MarkAsModified(*createdEvent.DatasetID); err != nil {
                        log.Printf("Warning: failed to mark dataset as modified: %v", err)
                }
        }
        
        // Get locale parameter for response (default to "en")
        locale := r.URL.Query().Get("locale")
        if locale == "" {
                locale = "en"
        }
        
        // Populate legacy fields based on locale for consistent response
        createdEvent.PopulateLegacyFields(locale)
        
        h.eventCache.Invalidate()

        // Increment Prometheus metrics
        metrics.EventsCreated.Inc()

        response.Created(w, createdEvent, "Event created successfully")
}

// UpdateEvent handles PUT /api/events/{id}
func (h *EventHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        idStr := vars["id"]
        
        id, err := strconv.Atoi(idStr)
        if err != nil {
                response.BadRequest(w, "Invalid event ID")
                return
        }
        
        var req models.CreateEventRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                response.BadRequest(w, "Invalid JSON format")
                return
        }
        
        
        // Validate coordinates
        if err := h.eventRepo.ValidateCoordinates(req.Latitude, req.Longitude); err != nil {
                response.BadRequest(w, err.Error())
                return
        }
        
        // Get current user from context
        user := getUserFromContext(r.Context())
        if user == nil {
                response.BadRequest(w, "User not found in context")
                return
        }
        
        // Convert request to event model and set ID
        event, err := req.ToHistoricalEvent(user.ID)
        if err != nil {
                response.BadRequest(w, err.Error())
                return
        }
        event.ID = id
        
        
        // Update event
        updatedEvent, err := h.eventRepo.Update(event)
        if err != nil {
                log.Printf("Error updating event: %v", err)
                if strings.Contains(err.Error(), "not found") {
                        response.NotFound(w, "Event not found")
                        return
                }
                response.InternalError(w, "Failed to update event")
                return
        }
        
        // Mark dataset as modified if event has a dataset
        if updatedEvent.DatasetID != nil && *updatedEvent.DatasetID > 0 {
                if err := h.datasetRepo.MarkAsModified(*updatedEvent.DatasetID); err != nil {
                        log.Printf("Warning: failed to mark dataset as modified: %v", err)
                }
        }
        
        // Get locale parameter for response (default to "en")
        locale := r.URL.Query().Get("locale")
        if locale == "" {
                locale = "en"
        }
        
        // Populate legacy fields based on locale for consistent response
        updatedEvent.PopulateLegacyFields(locale)
        
        h.eventCache.Invalidate()

        // Increment Prometheus metrics
        metrics.EventsUpdated.Inc()

        response.Success(w, updatedEvent)
}

// DeleteEvent handles DELETE /api/events/{id}
func (h *EventHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
        vars := mux.Vars(r)
        idStr := vars["id"]
        
        id, err := strconv.Atoi(idStr)
        if err != nil {
                response.BadRequest(w, "Invalid event ID")
                return
        }
        
        // Get the event first to find its dataset
        event, err := h.eventRepo.GetByID(id)
        if err != nil {
                log.Printf("Error getting event for delete: %v", err)
                if strings.Contains(err.Error(), "not found") {
                        response.NotFound(w, "Event not found")
                        return
                }
                response.InternalError(w, "Failed to get event")
                return
        }
        
        // Store dataset ID before deleting
        datasetID := event.DatasetID
        
        err = h.eventRepo.Delete(id)
        if err != nil {
                log.Printf("Error deleting event: %v", err)
                if strings.Contains(err.Error(), "not found") {
                        response.NotFound(w, "Event not found")
                        return
                }
                response.InternalError(w, "Failed to delete event")
                return
        }
        
        // Mark dataset as modified if event had a dataset
        if datasetID != nil && *datasetID > 0 {
                if err := h.datasetRepo.MarkAsModified(*datasetID); err != nil {
                        log.Printf("Warning: failed to mark dataset as modified: %v", err)
                }
        }
        
        h.eventCache.Invalidate()

        // Increment Prometheus metrics
        metrics.EventsDeleted.Inc()

        response.Success(w, map[string]string{"message": "Event deleted successfully"})
}

// GetEventsInBBox handles GET /api/events/bbox with locale support
func (h *EventHandler) GetEventsInBBox(w http.ResponseWriter, r *http.Request) {
        query := r.URL.Query()
        
        // Get locale parameter (default to "en")
        locale := query.Get("locale")
        if locale == "" {
                locale = "en"
        }
        
        minLat, err := parseCoordinate(query.Get("min_lat"))
        if err != nil {
                response.BadRequest(w, "Invalid min_lat parameter")
                return
        }
        
        minLng, err := parseCoordinate(query.Get("min_lng"))
        if err != nil {
                response.BadRequest(w, "Invalid min_lng parameter")
                return
        }
        
        maxLat, err := parseCoordinate(query.Get("max_lat"))
        if err != nil {
                response.BadRequest(w, "Invalid max_lat parameter")
                return
        }
        
        maxLng, err := parseCoordinate(query.Get("max_lng"))
        if err != nil {
                response.BadRequest(w, "Invalid max_lng parameter")
                return
        }
        
        events, err := h.eventRepo.GetInBoundingBox(minLat, minLng, maxLat, maxLng)
        if err != nil {
                log.Printf("Bounding box query error: %v", err)
                response.InternalError(w, "Failed to fetch events in bounding box")
                return
        }
        
        // Populate legacy fields based on locale
        for i := range events {
                events[i].PopulateLegacyFields(locale)
        }
        
        response.Success(w, events)
}

// GetEventsInRadius handles GET /api/events/radius with locale support
func (h *EventHandler) GetEventsInRadius(w http.ResponseWriter, r *http.Request) {
        query := r.URL.Query()
        
        // Get locale parameter (default to "en")
        locale := query.Get("locale")
        if locale == "" {
                locale = "en"
        }
        
        centerLat, err := parseCoordinate(query.Get("lat"))
        if err != nil {
                response.BadRequest(w, "Invalid lat parameter")
                return
        }
        
        centerLng, err := parseCoordinate(query.Get("lng"))
        if err != nil {
                response.BadRequest(w, "Invalid lng parameter")
                return
        }
        
        radius, err := parseCoordinate(query.Get("radius"))
        if err != nil || radius <= 0 {
                response.BadRequest(w, "Invalid radius parameter (must be > 0)")
                return
        }
        
        // Convert radius to rough bounding box for demo
        // TODO: Implement proper radius query with PostGIS ST_DWithin
        degreeRadius := radius / 111000 // Rough conversion from meters to degrees
        events, err := h.eventRepo.GetInBoundingBox(
                centerLat-degreeRadius, centerLng-degreeRadius,
                centerLat+degreeRadius, centerLng+degreeRadius)
        
        if err != nil {
                log.Printf("Radius query error: %v", err)
                response.InternalError(w, "Failed to fetch events within radius")
                return
        }
        
        // Populate legacy fields based on locale
        for i := range events {
                events[i].PopulateLegacyFields(locale)
        }
        
        response.Success(w, events)
}

// ImportEvents handles bulk importing of events from dataset
func (h *EventHandler) ImportEvents(w http.ResponseWriter, r *http.Request) {
        type ImportRequest struct {
                Filename string `json:"filename,omitempty"`
                Events []struct {
                        // Legacy fields for backward compatibility
                        Name        string   `json:"name,omitempty"`
                        Description string   `json:"description,omitempty"`
                        // New locale-specific fields
                        NameEN         string   `json:"name_en,omitempty"`
                        NameRU         string   `json:"name_ru,omitempty"`
                        DescriptionEN  string   `json:"description_en,omitempty"`
                        DescriptionRU  string   `json:"description_ru,omitempty"`
                        Date           string   `json:"date"`
                        Era            string   `json:"era"`
                        Latitude       float64  `json:"latitude"`
                        Longitude      float64  `json:"longitude"`
                        Type           string   `json:"type"`
                        Tags           []string `json:"tags"`
                        Source         string   `json:"source,omitempty"`
                } `json:"events"`
        }

        var req ImportRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                response.BadRequest(w, "Invalid JSON format")
                return
        }

        if len(req.Events) == 0 {
                response.BadRequest(w, "No events provided for import")
                return
        }

        // Get user ID from request context (set by auth middleware)
        userID := 1 // Default to admin user for now - in real app get from context
        if userCtx := r.Context().Value("user_id"); userCtx != nil {
                if uid, ok := userCtx.(int); ok {
                        userID = uid
                }
        }

        // Create dataset record
        filename := req.Filename
        if filename == "" {
                filename = "imported_dataset.json"
        }
        
        dataset := &models.EventDataset{
                Filename:    filename,
                Description: fmt.Sprintf("Dataset imported with %d events", len(req.Events)),
                EventCount:  0, // Will be updated as events are created
                UploadedBy:  userID,
        }
        
        createdDataset, err := h.datasetRepo.Create(dataset)
        if err != nil {
                log.Printf("Failed to create dataset record: %v", err)
                response.InternalError(w, "Failed to create dataset record")
                return
        }

        validLensTypes := map[string]bool{
                "historic":   true,
                "political":  true,
                "military":   true,
                "cultural":   true,
                "religious":  true,
                "scientific": true,
                "battle":     true,
        }

        importedCount := 0
        skippedEvents := []string{}
        for i, eventData := range req.Events {
                if eventData.Type == "" {
                        eventName := eventData.NameEN
                        if eventName == "" {
                                eventName = eventData.Name
                        }
                        if eventName == "" {
                                eventName = fmt.Sprintf("event #%d", i+1)
                        }
                        log.Printf("Skipping event '%s': missing required field 'type'", eventName)
                        skippedEvents = append(skippedEvents, fmt.Sprintf("'%s': missing type", eventName))
                        continue
                }

                if !validLensTypes[eventData.Type] {
                        eventName := eventData.NameEN
                        if eventName == "" {
                                eventName = eventData.Name
                        }
                        if eventName == "" {
                                eventName = fmt.Sprintf("event #%d", i+1)
                        }
                        log.Printf("Skipping event '%s': invalid type '%s' (valid: historic, political, military, cultural, religious, scientific, battle)", eventName, eventData.Type)
                        skippedEvents = append(skippedEvents, fmt.Sprintf("'%s': invalid type '%s'", eventName, eventData.Type))
                        continue
                }

                // Parse date with DD.MM.YYYY format
                parsedDate, err := time.Parse("02.01.2006", eventData.Date)
                if err != nil {
                        log.Printf("Failed to parse date %s: %v", eventData.Date, err)
                        continue
                }

                // Store BC dates as positive dates (same as predefined events)
                // The era field indicates BC/AD, astronomical conversion happens in views
                eventDate := parsedDate

                // Create event with dataset reference
                event := &models.HistoricalEvent{
                        Latitude:    eventData.Latitude,
                        Longitude:   eventData.Longitude,
                        EventDate:   eventDate,
                        Era:         eventData.Era,
                        LensType:    eventData.Type,
                        DisplayDate: formatDisplayDate(eventDate, eventData.Era),
                        DatasetID:   &createdDataset.ID,
                }

                // Handle locale-specific fields with fallbacks
                if eventData.NameEN != "" {
                        event.NameEn = eventData.NameEN
                } else if eventData.Name != "" {
                        // Legacy fallback: use legacy name as English
                        event.NameEn = eventData.Name
                }

                if eventData.NameRU != "" {
                        event.NameRu = eventData.NameRU
                }

                if eventData.DescriptionEN != "" {
                        event.DescriptionEn = &eventData.DescriptionEN
                } else if eventData.Description != "" {
                        // Legacy fallback: use legacy description as English
                        event.DescriptionEn = &eventData.Description
                }

                if eventData.DescriptionRU != "" {
                        event.DescriptionRu = &eventData.DescriptionRU
                }

                // Set legacy fields for backward compatibility
                if eventData.Name != "" {
                        event.Name = eventData.Name
                } else if eventData.NameEN != "" {
                        event.Name = eventData.NameEN
                }

                if eventData.Description != "" {
                        event.Description = eventData.Description
                } else if eventData.DescriptionEN != "" {
                        event.Description = eventData.DescriptionEN
                }

                // Set source if provided (handle optional field)
                if eventData.Source != "" {
                        event.Source = &eventData.Source
                }

                // Save event
                createdEvent, err := h.eventRepo.Create(event)
                if err != nil {
                        log.Printf("Failed to create event %s: %v", eventData.Name, err)
                        continue
                }

                // Handle tags - find or create and associate with event
                if len(eventData.Tags) > 0 {
                        var tagIDs []int
                        
                        // Get all existing tags to check for duplicates
                        existingTags, err := h.tagRepo.GetAllTags()
                        if err != nil {
                                log.Printf("Failed to get existing tags: %v", err)
                                existingTags = []models.Tag{} // Continue with empty list
                        }
                        
                        for _, tagName := range eventData.Tags {
                                // Check if tag already exists
                                var foundTag *models.Tag
                                for _, existing := range existingTags {
                                        if strings.EqualFold(existing.Name, tagName) {
                                                foundTag = &existing
                                                break
                                        }
                                }
                                
                                if foundTag != nil {
                                        // Use existing tag
                                        tagIDs = append(tagIDs, foundTag.ID)
                                } else {
                                        // Create new tag with random color
                                        tag := &models.Tag{
                                                Name:        tagName,
                                                Description: fmt.Sprintf("Auto-generated tag for %s", tagName),
                                                Color:       h.generateRandomColor(),
                                                Weight:      1,
                                        }
                                        
                                        createdTag, err := h.tagRepo.CreateTag(tag)
                                        if err != nil {
                                                log.Printf("Failed to create tag %s: %v", tagName, err)
                                                continue
                                        }
                                        
                                        tagIDs = append(tagIDs, createdTag.ID)
                                        // Add to existing tags list for next iteration
                                        existingTags = append(existingTags, *createdTag)
                                }
                        }
                        
                        // Associate all tags with the event
                        if len(tagIDs) > 0 {
                                err = h.tagRepo.SetEventTags(createdEvent.ID, tagIDs)
                                if err != nil {
                                        log.Printf("Failed to associate tags with event %s: %v", eventData.Name, err)
                                }
                        }
                }

                importedCount++
        }

        // Update dataset with final event count
        err = h.datasetRepo.UpdateEventCount(createdDataset.ID, importedCount)
        if err != nil {
                log.Printf("Failed to update dataset event count: %v", err)
        }

        h.eventCache.Invalidate()

        result := map[string]interface{}{
                "success":        true,
                "imported_count": importedCount,
                "total_count":    len(req.Events),
                "dataset_id":     createdDataset.ID,
                "dataset_name":   createdDataset.Filename,
                "message":        fmt.Sprintf("Successfully imported %d out of %d events", importedCount, len(req.Events)),
        }
        if len(skippedEvents) > 0 {
                result["skipped_count"] = len(skippedEvents)
                result["skipped_events"] = skippedEvents
        }
        response.Success(w, result)
}

// formatDisplayDate formats a date for display with era
func formatDisplayDate(date time.Time, era string) string {
        if era == "BC" {
                // BC dates are stored as positive dates, use them directly
                return fmt.Sprintf("%02d.%02d.%d BC", date.Day(), date.Month(), date.Year())
        }
        return fmt.Sprintf("%02d.%02d.%d AD", date.Day(), date.Month(), date.Year())
}

// parseCoordinate parses a coordinate string to float64
func parseCoordinate(coord string) (float64, error) {
        return strconv.ParseFloat(coord, 64)
}

// generateRandomColor generates a random hex color for tags
func (h *EventHandler) generateRandomColor() string {
        // Predefined vibrant colors that work well for tags
        colors := []string{
                "#3B82F6", // Blue
                "#EF4444", // Red
                "#10B981", // Green
                "#F59E0B", // Orange
                "#8B5CF6", // Purple
                "#06B6D4", // Cyan
                "#EC4899", // Pink
                "#84CC16", // Lime
                "#F97316", // Orange
                "#6366F1", // Indigo
                "#14B8A6", // Teal
                "#F43F5E", // Rose
        }
        return colors[rand.Intn(len(colors))]
}