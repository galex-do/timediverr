package models

import "time"

// Tag represents a tag that can be associated with events
type Tag struct {
        ID          int       `json:"id"`
        Name        string    `json:"name"`
        Description string    `json:"description"`
        Color       string    `json:"color"`
        BorderColor *string   `json:"border_color"`
        KeyColor    bool      `json:"key_color"`
        Emoji       *string   `json:"emoji"`
        Weight      int       `json:"weight"`
        EventCount  int       `json:"event_count"`
        CreatedAt   time.Time `json:"created_at"`
        UpdatedAt   time.Time `json:"updated_at"`
}

// CreateTagRequest represents the request payload for creating a tag
type CreateTagRequest struct {
        Name        string  `json:"name" validate:"required,max=100"`
        Description string  `json:"description"`
        Color       string  `json:"color,omitempty"`
        BorderColor *string `json:"border_color,omitempty"`
        KeyColor    *bool   `json:"key_color,omitempty"`
        Emoji       *string `json:"emoji,omitempty"`
        Weight      *int    `json:"weight,omitempty"`
}

// UpdateTagRequest represents the request payload for updating a tag
type UpdateTagRequest struct {
        Name             string  `json:"name,omitempty" validate:"max=100"`
        Description      string  `json:"description,omitempty"`
        Color            string  `json:"color,omitempty"`
        BorderColor      *string `json:"border_color,omitempty"`
        ClearBorderColor bool    `json:"clear_border_color,omitempty"`
        KeyColor         *bool   `json:"key_color,omitempty"`
        Emoji            *string `json:"emoji,omitempty"`
        ClearEmoji       bool    `json:"clear_emoji,omitempty"`
        Weight           *int    `json:"weight,omitempty"`
}

// EventTag represents the many-to-many relationship between events and tags
type EventTag struct {
        ID        int       `json:"id"`
        EventID   int       `json:"event_id"`
        TagID     int       `json:"tag_id"`
        CreatedAt time.Time `json:"created_at"`
}

// EventTagRef is the lightweight tag representation embedded in each event's
// "tags" array. Deliberately excludes EventCount/CreatedAt/UpdatedAt — those
// are never populated by the events_with_display_dates view (so they'd only
// ever serialize as dead zero-values) and are never read by the frontend for
// map/list display. With ~6 tags per event across thousands of events, this
// keeps the same tag from re-sending ~15 bytes of always-empty fields on
// every one of its repeated occurrences.
type EventTagRef struct {
        ID          int     `json:"id"`
        Name        string  `json:"name"`
        Description string  `json:"description"`
        Color       string  `json:"color"`
        BorderColor *string `json:"border_color"`
        KeyColor    bool    `json:"key_color"`
        Emoji       *string `json:"emoji"`
        Weight      int     `json:"weight"`
}

// ToTag converts CreateTagRequest to Tag
func (req *CreateTagRequest) ToTag() *Tag {
        color := req.Color
        if color == "" {
                color = "#3b82f6"
        }
        weight := 1
        if req.Weight != nil {
                weight = *req.Weight
        }
        
        keyColor := false
        if req.KeyColor != nil {
                keyColor = *req.KeyColor
        }
        
        return &Tag{
                Name:        req.Name,
                Description: req.Description,
                Color:       color,
                BorderColor: req.BorderColor,
                KeyColor:    keyColor,
                Emoji:       req.Emoji,
                Weight:      weight,
        }
}