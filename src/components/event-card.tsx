import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, MapPin } from "lucide-react"

interface Event {
  id: string
  name: string
  date: string
  time: string
  venue: string
  organizer: string
  organizerLogo: string
  image: string
  price: number
  capacity: number
  sold: number
  category: string
}

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const isSoldOut = event.sold >= event.capacity

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="overflow-hidden transition-all hover:scale-105 hover:shadow-lg cursor-pointer group">
        <CardContent className="p-0">
          {/* Event Image with Organizer Logo Overlay */}
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-accent">
            <img
              src={event.image || "/placeholder.svg"}
              alt={event.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            {/* Organizer Logo Overlay */}
            <div className="absolute top-3 left-3">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-background shadow-lg overflow-hidden">
                <img
                  src={event.organizerLogo || "/placeholder.svg"}
                  alt={event.organizer}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Category Badge */}
            {event.category && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="text-xs font-medium">
                  {event.category.charAt(0) + event.category.slice(1).toLowerCase().replace('_', ' ')}
                </Badge>
              </div>
            )}
            {/* Price Badge */}
            <div className="absolute bottom-3 right-3">
              {isSoldOut ? (
                <Badge variant="destructive" className="text-sm font-semibold px-3 py-1">
                  Sold Out
                </Badge>
              ) : (
                <Badge className="text-sm font-semibold px-3 py-1 bg-background text-foreground hover:bg-background">
                  From £{event.price}
                </Badge>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="p-4 space-y-3">
            {/* Event Name */}
            <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{event.name}</h3>

            {/* Event Info */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{event.date}</span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{event.time}</span>
              </div>

              {/* Venue */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1">{event.venue}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
