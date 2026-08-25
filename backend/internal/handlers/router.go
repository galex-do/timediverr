package handlers

import (
        "historical-events-backend/internal/database/repositories"
        "historical-events-backend/internal/models"
        "historical-events-backend/internal/services"
        "historical-events-backend/pkg/cache"
        "historical-events-backend/pkg/middleware"
        "net/http"

        "github.com/gorilla/mux"
        "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Router holds all the route handlers
type Router struct {
        eventHandler    *EventHandler
        templateHandler *TemplateHandler
        tagHandler      *TagHandler
        authHandler     *AuthHandler
        datasetHandler  *DatasetHandler
        supportHandler  *SupportHandler
        configHandler   *ConfigHandler
        regionHandler   *RegionHandler
}

// NewRouter creates a new router with all handlers
func NewRouter(eventRepo *repositories.EventRepository, templateRepo *repositories.TemplateRepository, tagRepo *repositories.TagRepository, datasetRepo *repositories.DatasetRepository, authService *services.AuthService, supportRepo *repositories.SupportRepository, regionRepo *repositories.RegionRepository) *Router {
        // Shared cache instance — both EventHandler and TagHandler must invalidate the same cache
        sharedEventCache := cache.NewEventCache()
        return &Router{
                eventHandler:    NewEventHandler(eventRepo, tagRepo, datasetRepo, sharedEventCache),
                templateHandler: NewTemplateHandler(templateRepo),
                tagHandler:      NewTagHandler(tagRepo, sharedEventCache),
                authHandler:     NewAuthHandler(authService),
                datasetHandler:  NewDatasetHandler(datasetRepo, eventRepo),
                supportHandler:  NewSupportHandler(supportRepo),
                configHandler:   NewConfigHandler(),
                regionHandler:   NewRegionHandler(regionRepo),
        }
}

// SetupRoutes configures all the routes and returns the router
func (router *Router) SetupRoutes() http.Handler {
        r := mux.NewRouter()
        
        // Add CORS middleware
        r.Use(middleware.CORS())
        
        // Add Prometheus middleware for HTTP metrics
        r.Use(middleware.Prometheus)
        
        // Compress responses (large list endpoints like /api/events repeat a
        // lot of tag data across events; gzip shrinks that dramatically)
        r.Use(middleware.Gzip())
        
        // Prometheus metrics endpoint (no auth required)
        r.Handle("/metrics", promhttp.Handler()).Methods("GET")
        
        // API routes
        api := r.PathPrefix("/api").Subrouter()
        
        // Authentication routes (public)
        api.HandleFunc("/auth/login", router.authHandler.Login).Methods("POST", "OPTIONS")
        api.HandleFunc("/auth/register", router.authHandler.Register).Methods("POST", "OPTIONS")
        api.HandleFunc("/auth/logout", router.authHandler.Logout).Methods("POST", "OPTIONS")
        api.HandleFunc("/auth/me", router.authHandler.AuthMiddleware(router.authHandler.Me)).Methods("GET", "OPTIONS")
        api.HandleFunc("/auth/change-password", router.authHandler.AuthMiddleware(router.authHandler.ChangePassword)).Methods("POST", "OPTIONS")
        
        // Session tracking (authenticated users)
        api.HandleFunc("/session/heartbeat", router.authHandler.AuthMiddleware(router.authHandler.SessionHeartbeat)).Methods("POST", "OPTIONS")
        
        // Anonymous session tracking (no auth required)
        api.HandleFunc("/session/anonymous-heartbeat", router.authHandler.AnonymousSessionHeartbeat).Methods("POST", "OPTIONS")
        
        // Event routes (public read, auth required for create/update/delete)
        api.HandleFunc("/events", router.authHandler.OptionalAuthMiddleware(router.eventHandler.GetAllEvents)).Methods("GET", "OPTIONS")
        api.HandleFunc("/events", router.authHandler.AuthMiddleware(router.eventHandler.CreateEvent)).Methods("POST", "OPTIONS")
        api.HandleFunc("/events/import", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.eventHandler.ImportEvents)).Methods("POST", "OPTIONS")
        api.HandleFunc("/events/{id}", router.authHandler.OptionalAuthMiddleware(router.eventHandler.GetEventByID)).Methods("GET", "OPTIONS")
        api.HandleFunc("/events/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.eventHandler.UpdateEvent)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/events/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.eventHandler.DeleteEvent)).Methods("DELETE", "OPTIONS")
        
        // Spatial query routes
        api.HandleFunc("/events/bbox", router.eventHandler.GetEventsInBBox).Methods("GET", "OPTIONS")
        api.HandleFunc("/events/radius", router.eventHandler.GetEventsInRadius).Methods("GET", "OPTIONS")
        
        // Template routes (read public, write requires admin)
        api.HandleFunc("/date-template-groups", router.templateHandler.GetAllGroups).Methods("GET", "OPTIONS")
        api.HandleFunc("/date-template-groups", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.templateHandler.CreateGroup)).Methods("POST", "OPTIONS")
        api.HandleFunc("/date-template-groups/{id}", router.templateHandler.GetGroupByID).Methods("GET", "OPTIONS")
        api.HandleFunc("/date-template-groups/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.templateHandler.UpdateGroup)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/date-template-groups/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.templateHandler.DeleteGroup)).Methods("DELETE", "OPTIONS")
        api.HandleFunc("/date-templates/{group_id}", router.templateHandler.GetTemplatesByGroup).Methods("GET", "OPTIONS")
        api.HandleFunc("/date-templates", router.templateHandler.GetAllTemplates).Methods("GET", "OPTIONS")
        api.HandleFunc("/date-templates", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.templateHandler.CreateTemplate)).Methods("POST", "OPTIONS")
        api.HandleFunc("/date-templates/single/{id}", router.templateHandler.GetTemplateByID).Methods("GET", "OPTIONS")
        api.HandleFunc("/date-templates/single/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.templateHandler.UpdateTemplate)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/date-templates/single/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.templateHandler.DeleteTemplate)).Methods("DELETE", "OPTIONS")
        
        // Tag routes (read public, write requires editor/admin)
        api.HandleFunc("/tags", router.tagHandler.GetAllTags).Methods("GET", "OPTIONS")
        api.HandleFunc("/tags", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.tagHandler.CreateTag)).Methods("POST", "OPTIONS")
        api.HandleFunc("/tags/{id}", router.tagHandler.GetTagByID).Methods("GET", "OPTIONS")
        api.HandleFunc("/tags/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.tagHandler.UpdateTag)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/tags/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.tagHandler.DeleteTag)).Methods("DELETE", "OPTIONS")
        
        // Dataset routes (admin only)
        api.HandleFunc("/datasets", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.datasetHandler.GetAllDatasets)).Methods("GET", "OPTIONS")
        api.HandleFunc("/datasets", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.datasetHandler.CreateDataset)).Methods("POST", "OPTIONS")
        api.HandleFunc("/datasets/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.datasetHandler.GetDatasetByID)).Methods("GET", "OPTIONS")
        api.HandleFunc("/datasets/{id}/export", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.datasetHandler.ExportDataset)).Methods("GET", "OPTIONS")
        api.HandleFunc("/datasets/{id}/reset-modified", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.datasetHandler.ResetModifiedFlag)).Methods("POST", "OPTIONS")
        api.HandleFunc("/datasets/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelAdmin)(router.datasetHandler.DeleteDataset)).Methods("DELETE", "OPTIONS")
        
        // User management routes (super users only)
        api.HandleFunc("/users", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.authHandler.GetAllUsers)).Methods("GET", "OPTIONS")
        api.HandleFunc("/users", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.authHandler.CreateUser)).Methods("POST", "OPTIONS")
        api.HandleFunc("/users/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.authHandler.UpdateUser)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/users/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.authHandler.DeleteUser)).Methods("DELETE", "OPTIONS")
        
        // Event-Tag relationship routes (requires editor/admin)
        api.HandleFunc("/events/{event_id}/tags/{tag_id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.tagHandler.AddTagToEvent)).Methods("POST", "OPTIONS")
        api.HandleFunc("/events/{event_id}/tags/{tag_id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.tagHandler.RemoveTagFromEvent)).Methods("DELETE", "OPTIONS")
        api.HandleFunc("/events/{event_id}/tags", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.tagHandler.SetEventTags)).Methods("PUT", "OPTIONS")
        
        // Support credentials routes (public read, admin for create/update/delete)
        api.HandleFunc("/support", router.supportHandler.GetSupportCredentials).Methods("GET", "OPTIONS")
        api.HandleFunc("/support", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.supportHandler.CreateSupportCredential)).Methods("POST", "OPTIONS")
        api.HandleFunc("/support", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.supportHandler.UpdateSupportCredential)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/support", router.authHandler.RequireAccessLevel(models.AccessLevelSuper)(router.supportHandler.DeleteSupportCredential)).Methods("DELETE", "OPTIONS")
        
        // Region routes (public: get by template; admin: CRUD)
        api.HandleFunc("/templates/{id}/regions", router.regionHandler.GetRegionsByTemplate).Methods("GET", "OPTIONS")
        api.HandleFunc("/regions", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.GetAllRegions)).Methods("GET", "OPTIONS")
        api.HandleFunc("/regions", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.CreateRegion)).Methods("POST", "OPTIONS")
        api.HandleFunc("/regions/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.GetRegionByID)).Methods("GET", "OPTIONS")
        api.HandleFunc("/regions/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.UpdateRegion)).Methods("PUT", "OPTIONS")
        api.HandleFunc("/regions/{id}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.DeleteRegion)).Methods("DELETE", "OPTIONS")
        api.HandleFunc("/regions/{id}/templates", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.LinkRegionToTemplates)).Methods("POST", "OPTIONS")
        api.HandleFunc("/regions/{id}/templates/{templateId}", router.authHandler.RequireAccessLevel(models.AccessLevelEditor)(router.regionHandler.UnlinkRegionFromTemplate)).Methods("DELETE", "OPTIONS")
        
        // Public config route (contact email, etc.)
        api.HandleFunc("/config", router.configHandler.GetPublicConfig).Methods("GET", "OPTIONS")
        
        // Health check endpoint
        api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
                w.WriteHeader(http.StatusOK)
                w.Write([]byte(`{"status": "healthy"}`))
        }).Methods("GET", "OPTIONS")
        
        return r
}