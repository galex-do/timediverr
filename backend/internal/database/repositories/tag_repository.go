package repositories

import (
        "database/sql"
        "historical-events-backend/internal/models"
)

// TagRepository handles database operations for tags
type TagRepository struct {
        db *sql.DB
}

// NewTagRepository creates a new TagRepository
func NewTagRepository(db *sql.DB) *TagRepository {
        return &TagRepository{db: db}
}

// GetAllTags retrieves all tags from the database
func (r *TagRepository) GetAllTags() ([]models.Tag, error) {
        query := `
                SELECT t.id, t.name, t.description, t.color, t.border_color, t.key_color, t.emoji, t.weight,
                        COALESCE(et.cnt, 0) AS event_count,
                        t.created_at, t.updated_at
                FROM tags t
                LEFT JOIN (
                        SELECT tag_id, COUNT(*) AS cnt FROM event_tags GROUP BY tag_id
                ) et ON et.tag_id = t.id
                ORDER BY name ASC`

        rows, err := r.db.Query(query)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var tags []models.Tag
        for rows.Next() {
                var tag models.Tag
                err := rows.Scan(
                        &tag.ID,
                        &tag.Name,
                        &tag.Description,
                        &tag.Color,
                        &tag.BorderColor,
                        &tag.KeyColor,
                        &tag.Emoji,
                        &tag.Weight,
                        &tag.EventCount,
                        &tag.CreatedAt,
                        &tag.UpdatedAt,
                )
                if err != nil {
                        return nil, err
                }
                tags = append(tags, tag)
        }

        return tags, nil
}

// GetTagByID retrieves a tag by its ID
func (r *TagRepository) GetTagByID(id int) (*models.Tag, error) {
        query := `
                SELECT id, name, description, color, border_color, key_color, emoji, weight, created_at, updated_at
                FROM tags
                WHERE id = $1`

        var tag models.Tag
        err := r.db.QueryRow(query, id).Scan(
                &tag.ID,
                &tag.Name,
                &tag.Description,
                &tag.Color,
                &tag.BorderColor,
                &tag.KeyColor,
                &tag.Emoji,
                &tag.Weight,
                &tag.CreatedAt,
                &tag.UpdatedAt,
        )

        if err != nil {
                return nil, err
        }

        return &tag, nil
}

// CreateTag creates a new tag
func (r *TagRepository) CreateTag(tag *models.Tag) (*models.Tag, error) {
        query := `
                INSERT INTO tags (name, description, color, border_color, key_color, emoji, weight)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, created_at, updated_at`

        err := r.db.QueryRow(query, tag.Name, tag.Description, tag.Color, tag.BorderColor, tag.KeyColor, tag.Emoji, tag.Weight).Scan(
                &tag.ID,
                &tag.CreatedAt,
                &tag.UpdatedAt,
        )

        if err != nil {
                return nil, err
        }

        return tag, nil
}

// UpdateTag updates an existing tag
func (r *TagRepository) UpdateTag(id int, tag *models.Tag) (*models.Tag, error) {
        query := `
                UPDATE tags 
                SET name = $2, description = $3, color = $4, border_color = $5, key_color = $6, emoji = $7, weight = $8, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, name, description, color, border_color, key_color, emoji, weight, created_at, updated_at`

        err := r.db.QueryRow(query, id, tag.Name, tag.Description, tag.Color, tag.BorderColor, tag.KeyColor, tag.Emoji, tag.Weight).Scan(
                &tag.ID,
                &tag.Name,
                &tag.Description,
                &tag.Color,
                &tag.BorderColor,
                &tag.KeyColor,
                &tag.Emoji,
                &tag.Weight,
                &tag.CreatedAt,
                &tag.UpdatedAt,
        )

        if err != nil {
                return nil, err
        }

        return tag, nil
}

// DeleteTag removes a tag from the database
func (r *TagRepository) DeleteTag(id int) error {
        query := `DELETE FROM tags WHERE id = $1`
        
        result, err := r.db.Exec(query, id)
        if err != nil {
                return err
        }

        rowsAffected, err := result.RowsAffected()
        if err != nil {
                return err
        }

        if rowsAffected == 0 {
                return sql.ErrNoRows
        }

        return nil
}

// DeleteUnusedTags removes every tag that isn't attached to any event and
// returns how many were deleted, for the admin "cleanup" action.
func (r *TagRepository) DeleteUnusedTags() (int, error) {
        query := `DELETE FROM tags t WHERE NOT EXISTS (SELECT 1 FROM event_tags et WHERE et.tag_id = t.id)`

        result, err := r.db.Exec(query)
        if err != nil {
                return 0, err
        }

        rowsAffected, err := result.RowsAffected()
        if err != nil {
                return 0, err
        }

        return int(rowsAffected), nil
}

// GetTagsByEventID retrieves all tags for a specific event
func (r *TagRepository) GetTagsByEventID(eventID int) ([]models.Tag, error) {
        query := `
                SELECT t.id, t.name, t.description, t.color, t.border_color, t.key_color, t.weight, t.created_at, t.updated_at
                FROM tags t
                JOIN event_tags et ON t.id = et.tag_id
                WHERE et.event_id = $1
                ORDER BY t.weight DESC, t.name ASC`

        rows, err := r.db.Query(query, eventID)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var tags []models.Tag
        for rows.Next() {
                var tag models.Tag
                err := rows.Scan(
                        &tag.ID,
                        &tag.Name,
                        &tag.Description,
                        &tag.Color,
                        &tag.BorderColor,
                        &tag.KeyColor,
                        &tag.Weight,
                        &tag.CreatedAt,
                        &tag.UpdatedAt,
                )
                if err != nil {
                        return nil, err
                }
                tags = append(tags, tag)
        }

        return tags, nil
}

// AddTagToEvent associates a tag with an event
func (r *TagRepository) AddTagToEvent(eventID, tagID int) error {
        query := `
                INSERT INTO event_tags (event_id, tag_id)
                VALUES ($1, $2)
                ON CONFLICT (event_id, tag_id) DO NOTHING`

        _, err := r.db.Exec(query, eventID, tagID)
        return err
}

// RemoveTagFromEvent removes the association between a tag and an event
func (r *TagRepository) RemoveTagFromEvent(eventID, tagID int) error {
        query := `DELETE FROM event_tags WHERE event_id = $1 AND tag_id = $2`
        
        _, err := r.db.Exec(query, eventID, tagID)
        return err
}

// SetEventTags replaces all tags for an event with a new set
func (r *TagRepository) SetEventTags(eventID int, tagIDs []int) error {
        tx, err := r.db.Begin()
        if err != nil {
                return err
        }
        defer tx.Rollback()

        // Remove all existing tags for the event
        _, err = tx.Exec("DELETE FROM event_tags WHERE event_id = $1", eventID)
        if err != nil {
                return err
        }

        // Add new tags
        for _, tagID := range tagIDs {
                _, err = tx.Exec("INSERT INTO event_tags (event_id, tag_id) VALUES ($1, $2)", eventID, tagID)
                if err != nil {
                        return err
                }
        }

        return tx.Commit()
}