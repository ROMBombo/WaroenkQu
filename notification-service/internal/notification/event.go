package notification

import "time"

// EventCreated adalah nama event WebSocket untuk notifikasi baru.
const EventCreated = "notification.created"

// Semua waktu dikirim dalam UTC+7, format sama dengan API Services ("2006-01-02T15:04:05+07:00").
var jakarta = time.FixedZone("WIB", 7*60*60)

const isoLayout = "2006-01-02T15:04:05-07:00"

type EventProduct struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// EventData sama bentuknya dengan item di GET /v1/notifications.
type EventData struct {
	ID               string       `json:"id"`
	Product          EventProduct `json:"product"`
	CatalogPublishID string       `json:"catalog_publish_id"`
	Message          string       `json:"message"`
	IsRead           bool         `json:"is_read"`
	CreatedAt        string       `json:"created_at"`
	ReadAt           *string      `json:"read_at"`
}

type EventMeta struct {
	UnreadCount int64 `json:"unread_count"`
}

type Event struct {
	Event string     `json:"event"`
	Data  EventData  `json:"data"`
	Meta  *EventMeta `json:"meta,omitempty"`
}

func newCreatedEvent(n *Notification, productName string, meta *EventMeta) Event {
	return Event{
		Event: EventCreated,
		Data: EventData{
			ID:               n.ID.String(),
			Product:          EventProduct{ID: n.ProductID.String(), Name: productName},
			CatalogPublishID: n.CatalogPublishID.String(),
			Message:          n.Message,
			IsRead:           n.IsRead,
			CreatedAt:        n.CreatedAt.In(jakarta).Format(isoLayout),
			ReadAt:           nil,
		},
		Meta: meta,
	}
}
