package models

import (
        "encoding/json"
        "fmt"
        "strings"
        "time"
)

// HistoricalEvent represents a historical event with geographical and temporal data
type HistoricalEvent struct {
        ID            int       `json:"id"`
        Name          string    `json:"name"`          // Legacy field - will be populated based on locale
        Description   string    `json:"description"`   // Legacy field - will be populated based on locale
        NameEn        string    `json:"name_en"`       // English name
        NameRu        string    `json:"name_ru"`       // Russian name
        DescriptionEn *string   `json:"description_en,omitempty"` // English description
        DescriptionRu *string   `json:"description_ru,omitempty"` // Russian description
        Latitude      float64   `json:"latitude"`
        Longitude     float64   `json:"longitude"`
        EventDate     time.Time `json:"-"` // Don't auto-marshal this field
        Era           string    `json:"era"`
        LensType      string    `json:"lens_type"`
        Source        *string   `json:"source,omitempty"` // Optional HTTP/HTTPS link to source
        DisplayDate   string    `json:"display_date,omitempty"`
        DatasetID     *int      `json:"dataset_id,omitempty"`
        CreatedBy     *int      `json:"created_by"`  // User ID who created this event
        UpdatedBy     *int      `json:"updated_by"`  // User ID who last updated this event
        CreatedAt     time.Time `json:"created_at"`  // When event was created
        UpdatedAt     time.Time `json:"updated_at"`  // When event was last updated
        Tags          []EventTagRef `json:"tags,omitempty"`
}

// GetNameForLocale returns the name for the specified locale
func (e HistoricalEvent) GetNameForLocale(locale string) string {
        switch locale {
        case "ru":
                return e.NameRu
        default:
                return e.NameEn
        }
}

// GetDescriptionForLocale returns the description for the specified locale
func (e HistoricalEvent) GetDescriptionForLocale(locale string) string {
        switch locale {
        case "ru":
                if e.DescriptionRu != nil {
                        return *e.DescriptionRu
                }
        default:
                if e.DescriptionEn != nil {
                        return *e.DescriptionEn
                }
        }
        return ""
}

// PopulateLegacyFields sets the legacy Name and Description fields based on the specified locale
func (e *HistoricalEvent) PopulateLegacyFields(locale string) {
        e.Name = e.GetNameForLocale(locale)
        e.Description = e.GetDescriptionForLocale(locale)
}

// MarshalJSON custom JSON marshaler to handle BC dates properly
func (e HistoricalEvent) MarshalJSON() ([]byte, error) {
        // Create alias to avoid infinite recursion
        type Alias HistoricalEvent
        
        // For all dates, use standard ISO format
        // The era field will indicate BC/AD
        eventDateStr := e.EventDate.Format("2006-01-02T15:04:05Z07:00")
        
        return json.Marshal(&struct {
                EventDate string `json:"event_date"`
                *Alias
        }{
                EventDate: eventDateStr,
                Alias:     (*Alias)(&e),
        })
}

// formatBCDate formats BC dates in a safe string format
func formatBCDate(year int, month time.Month, day int) string {
        return fmt.Sprintf("%04d-%02d-%02dT00:00:00Z", year, int(month), day)
}

// CreateEventRequest represents the request payload for creating an event
type CreateEventRequest struct {
        Name          string  `json:"name" validate:"required"`        // Legacy field - will be used for default locale content
        Description   string  `json:"description" validate:"required"` // Legacy field - will be used for default locale content
        NameEn        string  `json:"name_en,omitempty"`               // English name (optional, defaults to Name)
        NameRu        string  `json:"name_ru,omitempty"`               // Russian name (optional, defaults to Name)
        DescriptionEn *string `json:"description_en,omitempty"`        // English description (optional, defaults to Description)
        DescriptionRu *string `json:"description_ru,omitempty"`        // Russian description (optional, defaults to Description)
        Latitude      float64 `json:"latitude" validate:"required,min=-90,max=90"`
        Longitude     float64 `json:"longitude" validate:"required,min=-180,max=180"`
        EventDate     string  `json:"event_date" validate:"required"` // Changed to string to handle BC dates
        Era           string  `json:"era"`
        LensType      string  `json:"lens_type" validate:"required"`
        Source        *string `json:"source,omitempty"` // Optional HTTP/HTTPS link to source
        DatasetID     *int    `json:"dataset_id,omitempty"`
        TagIDs        []int   `json:"tag_ids,omitempty"`
}

// ParseEventDate parses the event date string handling BC dates properly
func (req *CreateEventRequest) ParseEventDate() (time.Time, error) {
        // Clean the date string - remove any " BC" or " AD" suffix that might be present
        dateStr := strings.TrimSuffix(strings.TrimSuffix(req.EventDate, " BC"), " AD")
        
        // Handle both simple date format and ISO timestamp format
        // Try ISO timestamp format first (from map creation): "1992-02-15T00:00:00.000Z"
        if t, err := time.Parse(time.RFC3339, dateStr); err == nil {
                return t, nil
        }
        
        // Try simple date format (from admin panel): "1992-02-15"
        if t, err := time.Parse("2006-01-02", dateStr); err == nil {
                return t, nil
        }
        
        // If both fail, return error
        return time.Time{}, fmt.Errorf("parsing time %q: invalid date format, expected YYYY-MM-DD or ISO timestamp", dateStr)
}

// ToHistoricalEvent converts CreateEventRequest to HistoricalEvent
func (req *CreateEventRequest) ToHistoricalEvent(createdBy int) (*HistoricalEvent, error) {
        era := req.Era
        if era == "" {
                era = "AD"
        }
        
        // Parse the event date string
        eventDate, err := req.ParseEventDate()
        if err != nil {
                // If parsing fails, return error instead of defaulting to today
                return nil, fmt.Errorf("invalid event date: %v", err)
        }
        
        // Handle locale-specific fields - if not provided, use legacy fields as default
        nameEn := req.NameEn
        if nameEn == "" {
                nameEn = req.Name
        }
        nameRu := req.NameRu
        if nameRu == "" {
                nameRu = req.Name // Default to same content for all locales
        }
        
        var descriptionEn, descriptionRu *string
        if req.DescriptionEn != nil {
                descriptionEn = req.DescriptionEn
        } else if req.Description != "" {
                descriptionEn = &req.Description
        }
        if req.DescriptionRu != nil {
                descriptionRu = req.DescriptionRu
        } else if req.Description != "" {
                descriptionRu = &req.Description // Default to same content for all locales
        }
        
        now := time.Now()
        event := &HistoricalEvent{
                Name:          req.Name,        // Legacy field
                Description:   req.Description, // Legacy field
                NameEn:        nameEn,
                NameRu:        nameRu,
                DescriptionEn: descriptionEn,
                DescriptionRu: descriptionRu,
                Latitude:      req.Latitude,
                Longitude:     req.Longitude,
                EventDate:     eventDate,
                Era:           era,
                LensType:      req.LensType,
                Source:        req.Source,
                DatasetID:     req.DatasetID,
                CreatedBy:     &createdBy,
                UpdatedBy:     &createdBy,  // Set updated_by field
                UpdatedAt:     now,         // Set updated_at field
        }
        
        return event, nil
}