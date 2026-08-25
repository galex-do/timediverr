package repositories

import (
        "database/sql"
        "encoding/json"
        "fmt"
        "historical-events-backend/internal/models"
        "log"

        "github.com/lib/pq"
)

// EventRepository handles event data operations
type EventRepository struct {
        db *sql.DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *sql.DB) *EventRepository {
        return &EventRepository{db: db}
}

// GetAll retrieves all events from the database
func (r *EventRepository) GetAll() ([]models.HistoricalEvent, error) {
        query := `
                SELECT id, name, description, latitude, longitude, event_date, era, lens_type, source, display_date, dataset_id, created_by, updated_by, created_at, updated_at, name_en, name_ru, description_en, description_ru, tags
                FROM events_with_display_dates 
                ORDER BY astronomical_year ASC`
        
        rows, err := r.db.Query(query)
        if err != nil {
                return nil, fmt.Errorf("failed to query events: %w", err)
        }
        defer rows.Close()
        
        var events []models.HistoricalEvent
        
        for rows.Next() {
                var event models.HistoricalEvent
                var tagsJSON []byte
                
                err := rows.Scan(&event.ID, &event.Name, &event.Description, &event.Latitude, 
                        &event.Longitude, &event.EventDate, &event.Era, &event.LensType, &event.Source, &event.DisplayDate, &event.DatasetID, &event.CreatedBy, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt, &event.NameEn, &event.NameRu, &event.DescriptionEn, &event.DescriptionRu, &tagsJSON)
                if err != nil {
                        log.Printf("Error scanning event: %v", err)
                        continue
                }
                
                // Parse tags JSON
                if len(tagsJSON) > 0 {
                        var tags []models.EventTagRef
                        if err := json.Unmarshal(tagsJSON, &tags); err != nil {
                                log.Printf("Error unmarshaling tags for event %d: %v", event.ID, err)
                                tags = []models.EventTagRef{}
                        }
                        event.Tags = tags
                } else {
                        event.Tags = []models.EventTagRef{}
                }
                
                events = append(events, event)
        }
        
        if err = rows.Err(); err != nil {
                return nil, fmt.Errorf("error iterating over events: %w", err)
        }
        
        return events, nil
}

// GetByIDs retrieves full event records for a specific set of IDs in one
// indexed query. Used by the batch-detail endpoint to lazily resolve
// descriptions/full tag data for events that were loaded via the lean list.
func (r *EventRepository) GetByIDs(ids []int) ([]models.HistoricalEvent, error) {
        if len(ids) == 0 {
                return []models.HistoricalEvent{}, nil
        }

        query := `
                SELECT id, name, description, latitude, longitude, event_date, era, lens_type, source, display_date, dataset_id, created_by, updated_by, created_at, updated_at, name_en, name_ru, description_en, description_ru, tags
                FROM events_with_display_dates
                WHERE id = ANY($1)
                ORDER BY astronomical_year ASC`

        rows, err := r.db.Query(query, pq.Array(ids))
        if err != nil {
                return nil, fmt.Errorf("failed to query events by ids: %w", err)
        }
        defer rows.Close()

        var events []models.HistoricalEvent

        for rows.Next() {
                var event models.HistoricalEvent
                var tagsJSON []byte

                err := rows.Scan(&event.ID, &event.Name, &event.Description, &event.Latitude,
                        &event.Longitude, &event.EventDate, &event.Era, &event.LensType, &event.Source, &event.DisplayDate, &event.DatasetID, &event.CreatedBy, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt, &event.NameEn, &event.NameRu, &event.DescriptionEn, &event.DescriptionRu, &tagsJSON)
                if err != nil {
                        log.Printf("Error scanning event: %v", err)
                        continue
                }

                if len(tagsJSON) > 0 {
                        var tags []models.EventTagRef
                        if err := json.Unmarshal(tagsJSON, &tags); err != nil {
                                log.Printf("Error unmarshaling tags for event %d: %v", event.ID, err)
                                tags = []models.EventTagRef{}
                        }
                        event.Tags = tags
                } else {
                        event.Tags = []models.EventTagRef{}
                }

                events = append(events, event)
        }

        if err = rows.Err(); err != nil {
                return nil, fmt.Errorf("error iterating over events: %w", err)
        }

        return events, nil
}

// GetByDatasetID retrieves all events from a specific dataset
func (r *EventRepository) GetByDatasetID(datasetID int) ([]models.HistoricalEvent, error) {
        query := `
                SELECT id, name, description, latitude, longitude, event_date, era, lens_type, source, display_date, dataset_id, created_by, updated_by, created_at, updated_at, name_en, name_ru, description_en, description_ru, tags
                FROM events_with_display_dates 
                WHERE dataset_id = $1
                ORDER BY astronomical_year ASC`
        
        rows, err := r.db.Query(query, datasetID)
        if err != nil {
                return nil, fmt.Errorf("failed to query events for dataset %d: %w", datasetID, err)
        }
        defer rows.Close()
        
        var events []models.HistoricalEvent
        
        for rows.Next() {
                var event models.HistoricalEvent
                var tagsJSON []byte
                
                err := rows.Scan(&event.ID, &event.Name, &event.Description, &event.Latitude, 
                        &event.Longitude, &event.EventDate, &event.Era, &event.LensType, &event.Source, &event.DisplayDate, &event.DatasetID, &event.CreatedBy, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt, &event.NameEn, &event.NameRu, &event.DescriptionEn, &event.DescriptionRu, &tagsJSON)
                if err != nil {
                        log.Printf("Error scanning event: %v", err)
                        continue
                }
                
                // Parse tags JSON
                if len(tagsJSON) > 0 {
                        var tags []models.EventTagRef
                        if err := json.Unmarshal(tagsJSON, &tags); err != nil {
                                log.Printf("Error unmarshaling tags for event %d: %v", event.ID, err)
                                tags = []models.EventTagRef{}
                        }
                        event.Tags = tags
                } else {
                        event.Tags = []models.EventTagRef{}
                }
                
                events = append(events, event)
        }
        
        if err = rows.Err(); err != nil {
                return nil, fmt.Errorf("error iterating over events for dataset %d: %w", datasetID, err)
        }
        
        return events, nil
}

// GetByID retrieves a single event by ID
func (r *EventRepository) GetByID(id int) (*models.HistoricalEvent, error) {
        query := `
                SELECT id, name, description, latitude, longitude, event_date, era, lens_type, source, display_date, dataset_id, created_by, updated_by, created_at, updated_at, name_en, name_ru, description_en, description_ru, tags
                FROM events_with_display_dates 
                WHERE id = $1`
        
        var event models.HistoricalEvent
        var tagsJSON []byte
        err := r.db.QueryRow(query, id).Scan(
                &event.ID, &event.Name, &event.Description, &event.Latitude,
                &event.Longitude, &event.EventDate, &event.Era, &event.LensType, &event.Source, &event.DisplayDate, &event.DatasetID, &event.CreatedBy, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt, &event.NameEn, &event.NameRu, &event.DescriptionEn, &event.DescriptionRu, &tagsJSON)
        
        if err != nil {
                if err == sql.ErrNoRows {
                        return nil, fmt.Errorf("event with id %d not found", id)
                }
                return nil, fmt.Errorf("failed to get event by id: %w", err)
        }
        
        // Parse tags JSON
        if len(tagsJSON) > 0 {
                var tags []models.EventTagRef
                if err := json.Unmarshal(tagsJSON, &tags); err != nil {
                        log.Printf("Error unmarshaling tags for event %d: %v", event.ID, err)
                        tags = []models.EventTagRef{}
                }
                event.Tags = tags
        } else {
                event.Tags = []models.EventTagRef{}
        }
        
        return &event, nil
}

// Create creates a new event in the database
func (r *EventRepository) Create(event *models.HistoricalEvent) (*models.HistoricalEvent, error) {
        query := `
                INSERT INTO events (name, description, latitude, longitude, event_date, era, lens_type, source, dataset_id, created_by, name_en, name_ru, description_en, description_ru) 
                VALUES ($1, $2, $3::double precision, $4::double precision, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
                RETURNING id`
        
        var createdEvent = *event
        
        err := r.db.QueryRow(query, event.Name, event.Description, event.Latitude, 
                event.Longitude, event.EventDate, event.Era, event.LensType, event.Source, event.DatasetID, event.CreatedBy, event.NameEn, event.NameRu, event.DescriptionEn, event.DescriptionRu).
                Scan(&createdEvent.ID)
        
        if err != nil {
                return nil, fmt.Errorf("failed to create event: %w", err)
        }
        
        return &createdEvent, nil
}

// GetInBoundingBox retrieves events within a geographical bounding box
func (r *EventRepository) GetInBoundingBox(minLat, minLng, maxLat, maxLng float64) ([]models.HistoricalEvent, error) {
        query := `
                SELECT e.id, e.name, e.description, e.latitude, e.longitude, e.event_date, e.era, e.lens_type, e.source,
                       e.display_date, e.dataset_id, e.created_by, e.updated_by, e.created_at, e.updated_at,
                       e.name_en, e.name_ru, e.description_en, e.description_ru, e.tags,
                       ST_X(ev.location::geometry) as lng, ST_Y(ev.location::geometry) as lat
                FROM events_with_display_dates e
                JOIN events ev ON e.id = ev.id
                WHERE ev.location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
                ORDER BY e.astronomical_year DESC`
        
        rows, err := r.db.Query(query, minLng, minLat, maxLng, maxLat)
        if err != nil {
                return nil, fmt.Errorf("bounding box query failed: %w", err)
        }
        defer rows.Close()
        
        var events []models.HistoricalEvent
        for rows.Next() {
                var event models.HistoricalEvent
                var lng, lat float64
                var tagsJSON []byte
                
                err := rows.Scan(&event.ID, &event.Name, &event.Description, 
                        &event.Latitude, &event.Longitude, &event.EventDate, &event.Era, &event.LensType, &event.Source,
                        &event.DisplayDate, &event.DatasetID, &event.CreatedBy, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt,
                        &event.NameEn, &event.NameRu, &event.DescriptionEn, &event.DescriptionRu, &tagsJSON,
                        &lng, &lat)
                if err != nil {
                        log.Printf("Error scanning bounding box event: %v", err)
                        continue
                }
                
                // Parse tags JSON
                if len(tagsJSON) > 0 {
                        var tags []models.EventTagRef
                        if err := json.Unmarshal(tagsJSON, &tags); err != nil {
                                log.Printf("Error unmarshaling tags for event %d: %v", event.ID, err)
                                tags = []models.EventTagRef{}
                        }
                        event.Tags = tags
                } else {
                        event.Tags = []models.EventTagRef{}
                }
                
                // Update with PostGIS coordinates for accuracy
                event.Longitude = lng
                event.Latitude = lat
                events = append(events, event)
        }
        
        if err = rows.Err(); err != nil {
                return nil, fmt.Errorf("error iterating over bounding box events: %w", err)
        }
        
        return events, nil
}

// Update updates an existing event in the database
func (r *EventRepository) Update(event *models.HistoricalEvent) (*models.HistoricalEvent, error) {
        query := `
                UPDATE events 
                SET name = $2, description = $3, latitude = $4::double precision, longitude = $5::double precision, 
                    event_date = $6, era = $7, lens_type = $8, source = $9, dataset_id = $10, updated_by = $11, updated_at = $12,
                    name_en = $13, name_ru = $14, description_en = $15, description_ru = $16
                WHERE id = $1
                RETURNING id, name, description, latitude, longitude, event_date, era, lens_type, source, dataset_id, created_at, updated_at, created_by, updated_by, name_en, name_ru, description_en, description_ru`
        
        var updatedEvent models.HistoricalEvent
        
        err := r.db.QueryRow(query, event.ID, event.Name, event.Description, 
                event.Latitude, event.Longitude, event.EventDate, event.Era, event.LensType, event.Source, event.DatasetID,
                event.UpdatedBy, event.UpdatedAt, event.NameEn, event.NameRu, event.DescriptionEn, event.DescriptionRu).
                Scan(&updatedEvent.ID, &updatedEvent.Name, &updatedEvent.Description, 
                &updatedEvent.Latitude, &updatedEvent.Longitude, &updatedEvent.EventDate, 
                &updatedEvent.Era, &updatedEvent.LensType, &updatedEvent.Source, &updatedEvent.DatasetID, &updatedEvent.CreatedAt,
                &updatedEvent.UpdatedAt, &updatedEvent.CreatedBy, &updatedEvent.UpdatedBy, &updatedEvent.NameEn, &updatedEvent.NameRu, &updatedEvent.DescriptionEn, &updatedEvent.DescriptionRu)
        
        if err != nil {
                if err == sql.ErrNoRows {
                        return nil, fmt.Errorf("event with id %d not found", event.ID)
                }
                return nil, fmt.Errorf("failed to update event: %w", err)
        }
        
        return &updatedEvent, nil
}

// Delete removes an event from the database
func (r *EventRepository) Delete(id int) error {
        query := `DELETE FROM events WHERE id = $1`
        
        result, err := r.db.Exec(query, id)
        if err != nil {
                return fmt.Errorf("failed to delete event: %w", err)
        }
        
        rowsAffected, err := result.RowsAffected()
        if err != nil {
                return fmt.Errorf("failed to get affected rows: %w", err)
        }
        
        if rowsAffected == 0 {
                return fmt.Errorf("event with id %d not found", id)
        }
        
        return nil
}

// ValidateCoordinates validates latitude and longitude values
func (r *EventRepository) ValidateCoordinates(lat, lng float64) error {
        if lat < -90 || lat > 90 {
                return fmt.Errorf("latitude must be between -90 and 90 degrees, got: %f", lat)
        }
        if lng < -180 || lng > 180 {
                return fmt.Errorf("longitude must be between -180 and 180 degrees, got: %f", lng)
        }
        return nil
}

// GetPaginated retrieves events with pagination support (kept for backward compatibility)
func (r *EventRepository) GetPaginated(page, limit int) ([]models.HistoricalEvent, int, error) {
        return r.GetPaginatedWithSort(page, limit, "date", "asc")
}

// GetPaginatedWithSort retrieves events with pagination and sorting support
func (r *EventRepository) GetPaginatedWithSort(page, limit int, sortField, sortDirection string) ([]models.HistoricalEvent, int, error) {
        // Calculate offset
        offset := (page - 1) * limit
        
        // Get total count first
        countQuery := `SELECT COUNT(*) FROM events_with_display_dates`
        var total int
        err := r.db.QueryRow(countQuery).Scan(&total)
        if err != nil {
                return nil, 0, fmt.Errorf("failed to count events: %w", err)
        }
        
        // Build ORDER BY clause based on sort parameters
        var orderByClause string
        switch sortField {
        case "name":
                orderByClause = "name"
        case "date":
                orderByClause = "astronomical_year"
        case "type":
                orderByClause = "lens_type"
        default:
                orderByClause = "astronomical_year" // Default to date sorting
        }
        
        if sortDirection != "asc" && sortDirection != "desc" {
                sortDirection = "asc" // Default to ascending
        }
        
        // Get paginated events with dynamic sorting
        query := fmt.Sprintf(`
                SELECT id, name, description, latitude, longitude, event_date, era, lens_type, display_date, created_by, updated_by, created_at, updated_at, name_en, name_ru, description_en, description_ru, tags
                FROM events_with_display_dates 
                ORDER BY %s %s
                LIMIT $1 OFFSET $2`, orderByClause, sortDirection)
        
        rows, err := r.db.Query(query, limit, offset)
        if err != nil {
                return nil, 0, fmt.Errorf("failed to query paginated events: %w", err)
        }
        defer rows.Close()
        
        var events []models.HistoricalEvent
        
        for rows.Next() {
                var event models.HistoricalEvent
                var tagsJSON []byte
                
                err := rows.Scan(&event.ID, &event.Name, &event.Description, &event.Latitude, 
                        &event.Longitude, &event.EventDate, &event.Era, &event.LensType, &event.DisplayDate, &event.CreatedBy, &event.UpdatedBy, &event.CreatedAt, &event.UpdatedAt, &event.NameEn, &event.NameRu, &event.DescriptionEn, &event.DescriptionRu, &tagsJSON)
                if err != nil {
                        log.Printf("Error scanning paginated event: %v", err)
                        continue
                }
                
                // Parse tags JSON
                if len(tagsJSON) > 0 {
                        var tags []models.EventTagRef
                        if err := json.Unmarshal(tagsJSON, &tags); err != nil {
                                log.Printf("Error unmarshaling tags for event %d: %v", event.ID, err)
                                tags = []models.EventTagRef{}
                        }
                        event.Tags = tags
                } else {
                        event.Tags = []models.EventTagRef{}
                }
                
                events = append(events, event)
        }
        
        if err = rows.Err(); err != nil {
                return nil, 0, fmt.Errorf("error iterating over paginated events: %w", err)
        }
        
        return events, total, nil
}